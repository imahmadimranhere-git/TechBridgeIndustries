import mongoose from 'mongoose';

const DUPLICATE_KEY = 11000;

// Atomic sequences, e.g. { _id: 'invoice', seq: 42 }
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

// Increment and return the next number in one atomic operation
counterSchema.statics.next = async function next(name, { session } = {}) {
  const options = { upsert: true, returnDocument: 'after', session };
  try {
    const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, options);
    return doc.seq;
  } catch (err) {
    // Two first-ever requests can race on the upsert; the retry then finds the document
    if (err.code !== DUPLICATE_KEY) throw err;
    const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, options);
    return doc.seq;
  }
};

// Used by Settings "next invoice number": the next call to next() returns nextNumber
counterSchema.statics.setNext = function setNext(name, nextNumber, { session } = {}) {
  return this.findOneAndUpdate(
    { _id: name },
    { $set: { seq: Math.max(Number(nextNumber) - 1, 0) } },
    { upsert: true, returnDocument: 'after', session }
  );
};

export default mongoose.model('Counter', counterSchema);