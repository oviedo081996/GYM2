require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb'); // Importar MongoDB

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

// ------------------ Configurar Nodemailer ------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// ======================= RUTA POST: CONTACTO =======================
app.post('/contact', async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
  }

  console.log('📩 Mensaje recibido:', { nombre, email, mensaje });

  try {
    // 1. Enviar correo al administrador
    await transporter.sendMail({
      from: '"Dynamo Gym" <dynamogym501@gmail.com>',
      to: 'dynamogym501@gmail.com',
      subject: 'Nuevo mensaje de contacto',
      text: `Nombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}`,
      replyTo: email
    });

    console.log('✅ Correo enviado correctamente.');

    // 2. Guardar en archivo local como respaldo
    const filePath = path.join(__dirname, 'mensajes.json');
    let mensajes = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]') : [];
    mensajes.push({ nombre, email, mensaje, fecha: new Date().toISOString() });
    fs.writeFileSync(filePath, JSON.stringify(mensajes, null, 2), 'utf-8');
    console.log('📝 Mensaje guardado en mensajes.json');

    // 3. Guardar en MongoDB
    const db = client.db("dynamogym");
    await db.collection("mensajes").insertOne({ nombre, email, mensaje, fecha: new Date() });
    console.log('📦 Mensaje guardado en MongoDB Atlas');

    return res.json({ msg: 'Mensaje procesado con éxito (correo + guardado en DB).' });

  } catch (error) {
    console.error('❌ Error en /contact:', error);
    return res.status(500).json({ msg: 'Hubo un error al procesar el mensaje.' });
  }
});

// ======================= RUTA POST: RESERVA =======================
app.post('/reserva', async (req, res) => {
  const { nombre, email, fecha, hora, zona, primeraVez } = req.body;

  if (!nombre || !email || !fecha || !hora || !zona || !primeraVez) {
    return res.status(400).json({ msg: 'Todos los campos de la reserva son obligatorios.' });
  }

  console.log('📅 Reserva recibida:', { nombre, email, fecha, hora, zona, primeraVez });

  try {
    // 1. Enviar correo al administrador
    await transporter.sendMail({
      from: '"Dynamo Gym" <dynamogym501@gmail.com>',
      to: 'dynamogym501@gmail.com',
      subject: 'Nueva reserva de entrenamiento',
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

    console.log('✅ Correo de reserva enviado.');

    // 2. Guardar en archivo local como respaldo
    const filePath = path.join(__dirname, 'reservaciones.json');
    let reservas = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]') : [];
    reservas.push({ nombre, email, fecha, hora, zona, primeraVez, fechaRegistro: new Date().toISOString() });
    fs.writeFileSync(filePath, JSON.stringify(reservas, null, 2), 'utf-8');
    console.log('📝 Reserva guardada en reservaciones.json');

    // 3. Guardar en MongoDB
    const db = client.db("dynamogym");
    await db.collection("reservas").insertOne({ nombre, email, fecha, hora, zona, primeraVez, fechaRegistro: new Date() });
    console.log('📦 Reserva guardada en MongoDB Atlas');

    return res.json({ msg: 'Reserva procesada con éxito (correo + guardado en DB).' });

  } catch (error) {
    console.error('❌ Error en /reserva:', error);
    return res.status(500).json({ msg: 'Hubo un error al procesar la reserva.' });
  }
});

// ======================= INICIAR SERVIDOR =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
