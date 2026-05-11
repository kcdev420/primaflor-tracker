import mongoose from 'mongoose';

const RegistroPaletSchema = new mongoose.Schema({
  paletero_nombre: { type: String },
  paletero_nomina: { type: String, required: true },
  pedido: { type: String, required: true },
  tipo_palet: { type: String, required: true },
  trabajador_nombre: { type: String, required: true },
  trabajador_nomina: { type: String, required: true },
  trabajador_ticket: { type: String, required: true },
  gavetas: { type: Number, default: 0 },
  palets: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'LECHUGA'
});

export default mongoose.models.RegistroPalet || mongoose.model('RegistroPalet', RegistroPaletSchema);