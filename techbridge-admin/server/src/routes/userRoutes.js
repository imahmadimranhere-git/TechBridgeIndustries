import { Router } from 'express';
import { UPLOAD_FOLDERS } from '../config/paths.js';
import * as controller from '../controllers/userController.js';
import { uploadImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { createUserSchema, updateUserSchema, userListQuery } from '../validators/userValidators.js';

const router = Router();

router.get('/', validate({ query: userListQuery }), controller.list);
router.post('/', validate({ body: createUserSchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.put('/:id', validate({ params: idParams, body: updateUserSchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

router.post('/:id/signature', validate({ params: idParams }), uploadImage(UPLOAD_FOLDERS.SIGNATURES), controller.uploadSignature);
router.delete('/:id/signature', validate({ params: idParams }), controller.removeSignature);
router.post('/:id/stamp', validate({ params: idParams }), uploadImage(UPLOAD_FOLDERS.STAMPS), controller.uploadStamp);
router.delete('/:id/stamp', validate({ params: idParams }), controller.removeStamp);

export default router;