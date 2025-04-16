import { Encoder } from '@tspruino/Encoder';
import { pins } from './definitions';

export const encoder = new Encoder(pins.encoder_a, pins.encoder_b, pins.encoder_press);
