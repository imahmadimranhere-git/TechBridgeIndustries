import { Router } from 'express';
import { UPLOAD_FOLDERS } from '../config/paths.js';
import * as controller from '../controllers/profileController.js';
import { uploadImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, profileUpdateSchema } from '../validators/userValidators.js';

const router = Router();

router.get('/', controller.show);
router.put('/', validate({ body: profileUpdateSchema }), controller.update);
router.put('/password', validate({ body: changePasswordSchema }), controller.changePassword);

router.post('/signature', uploadImage(UPLOAD_FOLDERS.SIGNATURES), controller.uploadSignature);
router.delete('/signature', controller.removeSignature);
router.post('/stamp', uploadImage(UPLOAD_FOLDERS.STAMPS), controller.uploadStamp);
router.delete('/stamp', controller.removeStamp);

export default router;import { Router } from 'express';
import { UPLOAD_FOLDERS } from '../config/paths.js';
import * as controller from '../controllers/profileController.js';
import { uploadImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, profileUpdateSchema } from '../validators/userValidators.js';

const router = Router();

router.get('/', controller.show);
router.put('/', validate({ body: profileUpdateSchema }), controller.update);
router.put('/password', validate({ body: changePasswordSchema }), controller.changePassword);

router.post('/signature', uploadImage(UPLOAD_FOLDERS.SIGNATURES), controller.uploadSignature);
router.delete('/signature', controller.removeSignature);
router.post('/stamp', uploadImage(UPLOAD_FOLDERS.STAMPS), controller.uploadStamp);
router.delete('/stamp', controller.removeStamp);

export default router;