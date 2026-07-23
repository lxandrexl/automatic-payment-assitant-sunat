import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CalcSettings } from '@tributo/core';
import { loadConfig } from '../config';
import { Settings, SettingsDocument, SETTINGS_ID } from '../schemas/settings.schema';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private readonly model: Model<SettingsDocument>) {}

  /** Devuelve el singleton, creándolo con defaults si no existe. */
  async get(): Promise<SettingsDocument> {
    const existing = await this.model.findById(SETTINGS_ID);
    if (existing) return existing;
    const cfg = loadConfig();
    return this.model.create({
      _id: SETTINGS_ID,
      ruc: process.env.RUC ?? '10727357730',
      rucLastDigit: cfg.rucLastDigit,
    });
  }

  async update(patch: object): Promise<SettingsDocument> {
    await this.get(); // asegura que exista
    const updated = await this.model.findByIdAndUpdate(SETTINGS_ID, patch, { new: true });
    return updated!;
  }

  /** Vista de las tasas para packages/core. */
  async calcSettings(): Promise<CalcSettings & { rucLastDigit: number; uitCents: number }> {
    const s = await this.get();
    return {
      igvRate: s.igvRate,
      detraccionRate: s.detraccionRate,
      detraccionThresholdCents: s.detraccionThresholdCents,
      pagoCuentaRate: s.pagoCuentaRate,
      retencion4taRate: s.retencion4taRate,
      rucLastDigit: s.rucLastDigit,
      uitCents: s.uitCents,
    };
  }
}
