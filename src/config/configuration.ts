import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    sheetId: process.env.GOOGLE_SHEET_ID,
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  },
  tokenDbPath: process.env.TOKEN_DB_PATH,
}));
