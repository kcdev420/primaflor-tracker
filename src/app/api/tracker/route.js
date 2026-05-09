import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import RegistroPalet from '../../../models/RegistroPalet';

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { paletero, trabajador, gavetasActuales, capacidad } = body; 

    // OPERACIÓN ATÓMICA REFINADA
    const registro = await RegistroPalet.findOneAndUpdate(
      {
        paletero_nomina: paletero.nomina,
        pedido: paletero.pedido,
        trabajador_nomina: trabajador.nomina,
        tipo_palet: paletero.tipoPalet // 👈 ESTO ES LO NUEVO: Separa los registros por tipo de palet
      },
      {
        $set: {
          trabajador_nombre: trabajador.nombre,
          trabajador_ticket: trabajador.ticket,
          gavetas: gavetasActuales,
          palets: Math.floor(gavetasActuales / capacidad)
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: registro });

  } catch (error) {
    console.error("Error en API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const nomina = searchParams.get('nomina');
    const pedido = searchParams.get('pedido');

    let query = {};
    if (nomina && pedido) {
      query = { paletero_nomina: nomina, pedido: pedido };
    }

    const registros = await RegistroPalet.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: registros });

  } catch (error) {
    console.error("Error recuperando datos:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}