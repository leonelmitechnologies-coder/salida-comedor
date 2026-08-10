const { Router } = require('express');
const router = Router();

router.post('/pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN requerido' });
  if (String(pin) === String(process.env.ADMIN_PIN)) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'PIN incorrecto' });
});

module.exports = router;
