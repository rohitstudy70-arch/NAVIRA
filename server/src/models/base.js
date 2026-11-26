import mongoose from 'mongoose';

export const photoSchema = new mongoose.Schema({
  url: { type: String, trim: true },
  publicId: { type: String, trim: true }
}, { _id: false });

export const addressSchema = new mongoose.Schema({
  line1: String,
  line2: String,
  city: String,
  state: String,
  postalCode: String
}, { _id: false });
