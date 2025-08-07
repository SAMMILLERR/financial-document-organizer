# 📊 Automated Financial Document Organizer

A powerful NestJS-based automation tool that streamlines financial record-keeping by intelligently scanning Gmail for invoices and receipts, organizing them in Google Drive, and logging details in Google Sheets.

## 🌟 Features

- **📧 Smart Email Scanning**: Automatically detects emails with "invoice" or "receipt" keywords
- **📁 Organized File Storage**: Uploads attachments to Google Drive with structured naming
- **📋 Automated Logging**: Records all processed documents in Google Sheets
- **🔐 Secure Authentication**: OAuth 2.0 integration with Google APIs
- **🔄 Duplicate Prevention**: Marks processed emails to avoid reprocessing
- **🛡️ Robust Error Handling**: Continues processing even if individual items fail

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gmail API     │    │  Google Drive   │    │ Google Sheets   │
│  (Email Scan)   │    │ (File Storage)  │    │   (Logging)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     NestJS Backend        │
                    │   - Gmail Service         │
                    │   - Drive Service         │
                    │   - Sheets Service        │
                    │   - Scan Controller       │
                    └───────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google Cloud Account** with API access

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd financial-doc-organizer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Application
PORT=3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Google Resources
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id

# Local Storage
TOKEN_DB_PATH=./tokens.json
```

### 4. Google Cloud Setup

#### Step 1: Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google Drive API
   - Google Sheets API

#### Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized origins: `http://localhost:3000`
5. Add redirect URIs: `http://localhost:3000/auth/callback`
6. Download the credentials JSON file

#### Step 3: Get Resource IDs

**Google Sheet ID:**
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
                                     ↑ Copy this part
```

**Google Drive Folder ID:**
```
https://drive.google.com/drive/folders/[FOLDER_ID]
                                      ↑ Copy this part
```

### 5. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 6. Complete OAuth Setup

1. Visit: `http://localhost:3000/auth/url`
2. Copy the authorization URL from the response
3. Open it in your browser and grant permissions
4. You'll be redirected back to the callback URL
5. Check for success message

## 📖 Usage

### Main Automation Endpoint

```bash
# Trigger the complete automation flow
GET http://localhost:3000/scan
```

**What it does:**
1. 📧 Scans Gmail for unread emails with "invoice" or "receipt" in subject
2. 📎 Downloads all attachments from matching emails
3. 📁 Uploads files to Google Drive with structured naming: `[Sender]_[Invoice#]_[Date].ext`
4. 📋 Logs email details and file IDs to Google Sheets
5. ✅ Marks emails as read to prevent reprocessing

### Debug Endpoints

```bash
# Test individual components
GET  /debug/gmail/emails      # Test Gmail scanning only
POST /debug/drive/upload      # Test Drive upload only
POST /debug/sheets/append     # Test Sheets logging only

# OAuth endpoints
GET  /auth/url               # Get authorization URL
GET  /auth/callback          # Handle OAuth callback
```

## 📊 Data Flow

```
📧 Gmail Scan → 📎 Download Attachments → 📁 Upload to Drive → 📋 Log to Sheets → ✅ Mark as Read
```

## 🗂️ File Structure

```
src/
├── config/
│   └── configuration.ts         # Environment configuration
├── google/
│   └── google-auth/            # OAuth 2.0 authentication
├── gmail/
│   ├── gmail.service.ts        # Email scanning logic
│   ├── gmail.controller.ts     # Debug endpoints
│   └── types.ts               # Gmail type definitions
├── drive/
│   ├── drive.service.ts        # File upload logic
│   ├── drive.controller.ts     # Debug endpoints
│   └── types.ts               # Drive type definitions
├── sheets/
│   ├── sheets.service.ts       # Spreadsheet logging
│   ├── sheets.controller.ts    # Debug endpoints
│   └── types.ts               # Sheets type definitions
├── scan/
│   ├── scan.service.ts         # Main orchestration logic
│   └── scan.controller.ts      # Main API endpoint
└── app.module.ts              # Application module
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | `GOCSPX-xxxxxxxxxxxx` |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/auth/callback` |
| `GOOGLE_SHEET_ID` | Target spreadsheet ID | `1ABC...xyz` |
| `GOOGLE_DRIVE_FOLDER_ID` | Target folder ID | `1DEF...uvw` |
| `TOKEN_DB_PATH` | Token storage path | `./tokens.json` |

### File Naming Convention

Files are automatically renamed using this pattern:
```
[Sender]_[InvoiceNumber]_[Date].[Extension]
```

**Examples:**
- `john_doe_12345_2025-08-07.pdf`
- `amazon_INV001_2025-08-07.jpg`
- `vendor_unknown_2025-08-07.xlsx`

## 📋 Google Sheets Structure

The application logs data to your Google Sheet with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| **From** | Sender email | `vendor@company.com` |
| **Date** | Email date | `Thu, 7 Aug 2025 16:35:35 +0530` |
| **Subject** | Email subject | `Invoice #12345` |
| **Invoice Number** | Extracted number | `12345` |
| **Drive File IDs** | Uploaded file IDs | `1abc...xyz, 1def...uvw` |
| **Processed At** | Processing timestamp | `2025-08-07T11:06:08.123Z` |

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run start:prod         # Start production build

# Testing
npm run test               # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:cov          # Run tests with coverage

# Code Quality
npm run lint              # Run ESLint
npm run format            # Format with Prettier
```

### Adding New Features

1. **Create a new service** in the appropriate module
2. **Add proper TypeScript types** in `types.ts`
3. **Implement error handling** and logging
4. **Add debug endpoints** for testing
5. **Update the main scan service** to include new logic

## 🔍 Troubleshooting

### Common Issues

**❌ "No tokens found" error**
- Complete OAuth setup: `GET /auth/url`
- Ensure tokens.json file exists and has valid content

**❌ "Cannot find module" errors**
- Run `npm install` to ensure all dependencies are installed
- Check that all import paths are correct

**❌ "API not enabled" errors**
- Enable required APIs in Google Cloud Console:
  - Gmail API
  - Google Drive API  
  - Google Sheets API

**❌ "Invalid credentials" errors**
- Verify OAuth credentials in `.env` file
- Ensure redirect URI matches exactly: `http://localhost:3000/auth/callback`

**❌ "Permission denied" errors**
- Check that Google account has access to specified Sheet and Drive folder
- Verify OAuth scopes include necessary permissions

### Debug Mode

Enable detailed logging:
```bash
# Set log level to debug
NODE_ENV=development npm run start:dev
```

Use debug endpoints to test individual components:
```bash
curl http://localhost:3000/debug/gmail/emails
curl -X POST http://localhost:3000/debug/drive/upload
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework
- Uses [Google APIs](https://developers.google.com/) for Gmail, Drive, and Sheets integration
- Inspired by the need for automated financial document management

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the [Google API documentation](https://developers.google.com/)
3. Open an issue on GitHub

**Made with ❤️ for automated financial organization**
