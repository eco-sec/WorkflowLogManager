# Workflow Log Manager

SAP UI5 application for managing and reporting on workflow requests and training class approvals.

## Overview

The Workflow Log Manager is designed to help managers and employees track training requests, approvals, and workflow statuses. It provides comprehensive views of workflow data with various filtering and search capabilities.

## Features

- View all workflow reports with multiple status types
- Filter workflows by employee, date range, and status
- Detailed workflow view with full request information
- Employee hierarchy navigation
- Comprehensive mock server for local development
- Responsive design for desktop, tablet, and mobile devices

## Local Development Setup

### Prerequisites

- Node.js (v12 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository or navigate to the project directory:
```bash
cd WorkflowLogManager
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

Start the local development server:
```bash
npm start
```

The application will automatically open in your default browser at `http://localhost:8081`.

### Mock Server

The application includes a comprehensive mock server that automatically activates when running on localhost. This allows you to develop and test without connecting to real backend services.

#### Mock Server Features

- **Automatic Activation**: Enabled automatically on localhost/127.0.0.1
- **Production Ready**: Automatically disabled in production environments
- **jQuery AJAX Interception**: Intercepts all API calls before they reach the network layer
- **OData v2 Compatible**: Fully compatible with SAP OData v2 services

#### Mock Data Includes

- **Current User**: Ahmed Hassan (Badge: 107119)
- **Subordinates**: 50 mock employees with hierarchical structure
- **Workflow Reports**: 6 workflow requests with various statuses:
  - Pending
  - Approved
  - Rejected
  - Completed
  - In Progress
  - Cancelled
- **Picklists**: Workflow statuses, priorities, and departments
- **Employee Data**: Comprehensive employee information

#### Mock Server Endpoints

The mock server intercepts the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scpServices/userAPI/currentUser` | GET | Current user information |
| `/cpi/employee/getSubordinate` | GET | Employee subordinates |
| `/lmsproject/hana/xsodata/WorkflowReportService.xsodata/WorkflowLogView` | GET | Workflow reports list |
| `/lmsproject/hana/xsjs/PicklistService.xsjs` | GET | Picklist data |
| `/cpi/workflow/approve` | POST | Approve workflow |
| `/cpi/workflow/reject` | POST | Reject workflow |

### Mock Server Implementation

The mock server is implemented in two files:

1. **`webapp/localService/mockserver.js`**: Main mock server logic
   - jQuery AJAX interception
   - Request routing and response handling
   - OData metadata generation

2. **`webapp/localService/mockdata.js`**: Mock data definitions
   - All mock response data
   - Employee hierarchies
   - Workflow reports with various statuses

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with hot reload |
| `npm run build` | Build production-ready application |

### Project Structure

```
WorkflowReport/
├── webapp/                    # Application source code
│   ├── Component.js          # Main UI5 component with mock server initialization
│   ├── manifest.json         # Application manifest
│   ├── index.html           # Entry point
│   │
│   ├── controller/          # MVC Controllers
│   │   ├── WorkflowReportList.controller.js
│   │   ├── WorkflowReportDetails.controller.js
│   │   └── WorkflowReportListSingle.controller.js
│   │
│   ├── view/                # XML Views
│   │   ├── WorkflowReportList.view.xml
│   │   ├── WorkflowReportDetails.view.xml
│   │   └── WorkflowReportListSingle.view.xml
│   │
│   ├── service/             # Business Logic Services
│   │   ├── WorkflowReportService.js
│   │   ├── EmployeeService.js
│   │   └── PicklistService.js
│   │
│   ├── model/
│   │   └── models.js        # Data models
│   │
│   ├── localService/        # Mock Server (Local Development)
│   │   ├── mockserver.js    # Mock server implementation
│   │   └── mockdata.js      # Mock data definitions
│   │
│   ├── i18n/
│   │   └── i18n.properties  # Internationalization
│   │
│   └── css/
│       └── style.css        # Application styling
│
├── dist/                    # Build output (git-ignored)
├── node_modules/            # Dependencies (git-ignored)
├── package.json            # npm configuration
├── ui5.yaml               # UI5 build configuration
├── neo-app.json           # SAP Neo configuration
└── .gitignore             # Git ignore rules
```

## Application Configuration

### Main Application Details

- **App ID**: `workflowReport.workflowReport`
- **UI5 Version**: 1.65.6 (minimum)
- **Target Devices**: Desktop, Tablet, Phone
- **Data Sources**: OData v2 service

### Routes

The application uses SAP UI5 routing with three main routes:

1. **WorkflowReportList** (`/`)
   - Default route showing list of all workflows
   - Supports filtering and search

2. **WorkflowReportDetails** (`/details/{requestId}`)
   - Detailed view for a specific workflow request
   - Shows full request information and history

3. **WorkflowReportListSingle** (`/RouteWorkflowReportListSingle/{employeeId}/{startDate}/{endDate}`)
   - Filtered workflow list for a specific employee
   - Date range filtering

## Building for Production

Build the application for production deployment:

```bash
npm run build
```

The build output will be generated in the `/dist` directory with:
- Minified JavaScript
- Component preload bundles
- Manifest bundling
- Cache buster information

### Production Deployment

The application automatically disables the mock server in production environments. No code changes are required.

**Supported Platforms**:
- SAP Business Technology Platform (Cloud Foundry)
- SAP Neo Platform
- SAP HANA Cloud Platform
- SAP WebIDE / Business Application Studio

## Testing

The mock server provides realistic data for testing all application features:

1. **User Authentication**: Simulates logged-in user (Ahmed Hassan)
2. **Employee Hierarchy**: 50+ subordinates for testing search and filtering
3. **Workflow Statuses**: All workflow states (Pending, Approved, Rejected, etc.)
4. **Date Ranges**: Historical and future workflow requests
5. **Department Filtering**: Multiple departments and cost centers

## Troubleshooting

### Server Won't Start

If the server fails to start:
1. Ensure all dependencies are installed: `npm install`
2. Check if port 8081 is already in use
3. Clear npm cache: `npm cache clean --force`

### Mock Server Not Working

If the mock server isn't intercepting requests:
1. Check browser console for initialization messages
2. Verify you're running on `localhost` or `127.0.0.1`
3. Clear browser cache and reload

### Build Errors

If the build fails:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Delete `dist` folder and rebuild: `rm -rf dist && npm run build`

## License

This project is part of the SAP LMS ecosystem.

## Support

For issues or questions, please contact the development team.

---

**Happy Coding!** 🚀
