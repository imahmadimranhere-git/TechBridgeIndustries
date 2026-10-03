// Hooks that should hide soft-deleted documents automatically
const QUERY_HOOKS = [
  'countDocuments',
  'distinct',
  'find',
  'findOne',
  'findOneAndUpdate',
  'updateMany',
  'updateOne',
];

const hasDeletedAtCondition = (filter = {}) => Object.hasOwn(filter, 'deletedAt');

/**
 * Soft delete plugin.
 * - Adds `deletedAt` (null = active).
 * - Normal queries and aggregations exclude deleted documents.
 * - To include deleted ones, put ANY deletedAt condition in the filter, e.g.
 *     Model.find({ deletedAt: { $ne: null } })      // only deleted
 *     Model.findWithDeleted({ client: id })          // active + deleted
 */
export default function softDeletePlugin(schema) {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });

  schema.pre(QUERY_HOOKS, function excludeDeleted() {
    if (hasDeletedAtCondition(this.getFilter())) return;
    this.where({ deletedAt: null });
  });

  schema.pre('aggregate', function excludeDeletedInAggregate() {
    const firstStage = this.pipeline()[0];
    if (firstStage?.$match && hasDeletedAtCondition(firstStage.$match)) return;
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });

  schema.statics.findWithDeleted = function findWithDeleted(filter = {}) {
    return this.find({ ...filter, deletedAt: { $exists: true } });
  };

  schema.methods.softDelete = function softDelete(options = {}) {
    this.deletedAt = new Date();
    return this.save({ validateBeforeSave: false, ...options });
  };

  schema.methods.restore = function restore(options = {}) {
    this.deletedAt = null;
    return this.save({ validateBeforeSave: false, ...options });
  };

  schema.virtual('isDeleted').get(function isDeleted() {
    return Boolean(this.deletedAt);
  });
}