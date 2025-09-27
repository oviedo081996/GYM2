
app.get('/test-email', async (req, res) => {
  try {
    const mailOptions = {
      from: `"Dynamo Gym" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: 'Correo de prueba desde backend',
      text: 'Este es un correo de prueba para verificar que Nodemailer y dotenv están funcionando.',
    };

    await transporter.sendMail(mailOptions);
    res.send('Correo de prueba enviado correctamente.');
  } catch (error) {
    console.error('Error enviando correo de prueba:', error);
    res.status(500).send('Error al enviar correo de prueba.');
  }
});