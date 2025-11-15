require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { Resend } = require('resend');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ------------------ Conexión a MongoDB Atlas ------------------
const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err);
  }
}
connectDB();

// ======================= RUTA POST: CONTACTO =======================
app.post('/contact', async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
  }

  console.log('📩 Mensaje recibido:', { nombre, email, mensaje });

  try {
    // 1) Guardar en MongoDB primero
    const db = client.db("dynamogym");
    const insertResult = await db.collection("mensajes").insertOne({
      nombre,
      email,
      mensaje,
      fecha: new Date()
    });

    console.log("📦 Guardado en MongoDB:", insertResult.insertedId);

    // 2) Guardar respaldo local (opcional)
    try {
      const filePath = path.join(__dirname, 'mensajes.json');
      let mensajes = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]')
        : [];

      mensajes.push({ nombre, email, mensaje, fecha: new Date().toISOString() });

      fs.writeFileSync(filePath, JSON.stringify(mensajes, null, 2), 'utf-8');
      console.log('📝 Respaldo guardado en mensajes.json');
    } catch (fsErr) {
      console.error("⚠️ Error guardando respaldo local:", fsErr);
    }

    // 3) Intentar enviar correo vía Resend
    try {
      await resend.emails.send({
        from: "Dynamo Gym <no-reply@dynamogym.com>",
        to: "dynamogym501@gmail.com",
        subject: "Nuevo mensaje de contacto",
        html: `
          <h3>Nuevo mensaje desde el formulario</h3>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong> ${mensaje}</p>
        `
      });

      console.log("✉️ Correo enviado exitosamente vía Resend");
    } catch (emailErr) {
      console.error("❌ Error enviando correo (Resend):", emailErr);
    }

    return res.json({ msg: 'Mensaje procesado con éxito (guardado en DB).' });

  } catch (error) {
    console.error('❌ Error en /contact:', error);
    return res.status(500).json({ msg: 'Hubo un error al procesar la solicitud.' });
  }
});


// ======================= RUTA POST: RESERVA =======================
app.post('/reserva', async (req, res) => {
  const { nombre, email, fecha, hora, zona, primeraVez } = req.body;

  if (!nombre || !email || !fecha || !hora || !zona || !primeraVez) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
  }

  console.log('📅 Reserva recibida:', { nombre, email, fecha, hora, zona, primeraVez });

  try {
    // 1) Guardar en MongoDB
    const db = client.db("dynamogym");
    const insertResult = await db.collection("reservas").insertOne({
      nombre,
      email,
      fecha,
      hora,
      zona,
      primeraVez,
      fechaRegistro: new Date()
    });

    console.log("📦 Reserva guardada en DB:", insertResult.insertedId);

    // 2) Guardar respaldo local
    try {
      const filePath = path.join(__dirname, 'reservaciones.json');
      let reservas = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]')
        : [];

      reservas.push({
        nombre,
        email,
        fecha,
        hora,
        zona,
        primeraVez,
        fechaRegistro: new Date().toISOString()
      });

      fs.writeFileSync(filePath, JSON.stringify(reservas, null, 2), 'utf-8');

      console.log('📝 Backup guardado en reservaciones.json');
    } catch (fsErr) {
      console.error("⚠️ Error en respaldo local:", fsErr);
    }

    // 3) Intentar enviar correo vía Resend
    try {
      await resend.emails.send({
        from: "Dynamo Gym <no-reply@dynamogym.com>",
        to: "dynamogym501@gmail.com",
        subject: "Nueva reserva de entrenamiento",
        html: `
          <h3>Nueva Reserva</h3>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Hora:</strong> ${hora}</p>
          <p><strong>Zona:</strong> ${zona}</p>
          <p><strong>¿Primera vez?:</strong> ${primeraVez}</p>
        `
      });

      console.log("✉️ Correo de reserva enviado vía Resend");
    } catch (emailErr) {
      console.error("❌ Error enviando correo (Resend):", emailErr);
    }

    return res.json({ msg: 'Reserva procesada con éxito (guardada en DB).' });

  } catch (error) {
    console.error('❌ Error en /reserva:', error);
    return res.status(500).json({ msg: 'Hubo un error al procesar la solicitud.' });
  }
});

// ======================= INICIAR SERVIDOR =======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
