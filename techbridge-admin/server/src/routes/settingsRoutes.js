import { Router } from 'express';
import { UPLOAD_FOLDERS } from '../config/paths.js';
import * as controller from '../controllers/settingsController.js';
import { uploadImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { settingsUpdateSchema } from '../validators/settingsValidators.js';

const router = Router();

router.get('/', controller.show);
router.put('/', validate({ body: settingsUpdateSchema }), controller.update);

router.post('/logo', uploadImage(UPLOAD_FOLDERS.BRANDING), controller.uploadLogo);
router.delete('/logo', controller.removeLogo);
router.post('/stamp', uploadImage(UPLOAD_FOLDERS.STAMPS), controller.uploadStamp);
router.delete('/stamp', controller.removeStamp);

export default router;