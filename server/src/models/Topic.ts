import { Schema, model, type InferSchemaType } from 'mongoose';
import { TOPIC_SLUGS } from '@luna/shared';

const topicSchema = new Schema({
  slug: { type: String, enum: TOPIC_SLUGS, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  order: { type: Number, required: true },
});

export type Topic = InferSchemaType<typeof topicSchema>;
export const TopicModel = model('Topic', topicSchema);
