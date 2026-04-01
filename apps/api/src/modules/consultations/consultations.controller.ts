import { Request, Response } from "express";
import { diagnoseChild } from "../inference/inference.service";

export async function diagnoseController(req: Request, res: Response) {
  try {
    const result = await diagnoseChild(req.body);

    return res.status(200).json({
      success: true,
      message: "Diagnosis awal berhasil diproses",
      disclaimer: "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses diagnosis",
    });
  }
}