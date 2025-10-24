# Workflow Log Manager - Deployment Guide

## Overview

This document describes the required configuration for deploying the Workflow Log Manager application to SAP Cloud Platform (SAP BTP).

## Prerequisites

- SAP BTP account with Fiori Launchpad enabled
- Access to SAP HANA database with LMS project schema
- SAP Cloud Platform Integration (CPI) instance
- User API service endpoint

## Required SAP BTP Destinations

You must configure the following destinations in your SAP BTP cockpit before deploying the application.

### 1. HANA_DB_LMS

**Purpose**: Backend database for workflow report data and XSJS services

**Configuration**:
- **Name**: `HANA_DB_LMS`
- **Type**: HTTP
- **URL**: `https://<your-hana-host>:<port>`
- **Proxy Type**: Internet
- **Authentication**: BasicAuthentication (or appropriate for your setup)
- **User**: `<hana-username>`
- **Password**: `<hana-password>`

**Additional Properties**:
```
WebIDEEnabled = true
WebIDEUsage = odata_abap,odata_gen
sap-client = <your-client-number>
```

**Endpoints served**:
- `/lmsproject/hana/xsodata/WorkflowReportService.xsodata` - OData v2 service for workflow reports
- `/lmsproject/hana/xsjs/PicklistService.xsjs` - Picklist data service

---

### 2. CPI_LMS

**Purpose**: SAP Cloud Platform Integration for workflow processing

**Configuration**:
- **Name**: `CPI_LMS`
- **Type**: HTTP
- **URL**: `https://<your-cpi-host>/http`
- **Proxy Type**: Internet
- **Authentication**: BasicAuthentication or OAuth2SAMLBearerAssertion
- **User**: `<cpi-username>`
- **Password**: `<cpi-password>`

**Additional Properties**:
```
WebIDEEnabled = true
```

**Endpoints served**:
- `/cpi/lms/instance-work-items` - Task details retrieval
- `/cpi/workflow/approve` - Workflow approval endpoint
- `/cpi/workflow/reject` - Workflow rejection endpoint
- `/cpi/employee/details` - Employee information service

---

### 3. USER_API

**Purpose**: Current user information for personalization

**Configuration**:
- **Name**: `USER_API`
- **Type**: HTTP
- **URL**: `https://<your-user-api-host>`
- **Proxy Type**: Internet
- **Authentication**: As required by your user API (typically OAuth or AppToAppSSO)

**Additional Properties**:
```
WebIDEEnabled = true
sap-platform = CF (or NEO depending on your setup)
```

**Endpoints served**:
- `/scpServices/userAPI/currentUser` - Returns current logged-in user details

---

## Fiori Launchpad Configuration

The application is configured to be launched from SAP Fiori Launchpad with the following settings:

**Intent Navigation**:
- **Semantic Object**: `WorkflowLogManager`
- **Action**: `Display`
- **Launch URL**: `#WorkflowLogManager-Display`

**Tile Configuration**:
- **Title**: Workflow Log
- **Subtitle**: Report
- **Icon**: sap-icon://approvals
- **Type**: Static Tile

**Application ID**: `workflowLogManager.workflowLogManager`

### Adding to Fiori Launchpad

1. Navigate to your SAP BTP Cockpit
2. Go to Services > Launchpad Service
3. Open Site Manager
4. Create or edit a content provider
5. Add the application using the `flp-config.json` file
6. Assign to appropriate groups and catalogs
7. Publish the site

---

## Deployment Steps

### 1. Build the Application

```bash
npm install
npm run build
```

### 2. Deploy to SAP BTP

Using the SAP Cloud Platform CLI:

```bash
# Login to your SAP BTP account
neo login --host <region-host> --account <account-id> --user <user-email>

# Deploy the application
neo deploy --host <region-host> --account <account-id> --application workflowlogmanager --source ./
```

**Or** using MTA deployment (if configured):

```bash
mbt build
cf deploy mta_archives/<your-mtar-file>.mtar
```

### 3. Configure Destinations

1. In SAP BTP Cockpit, navigate to **Connectivity > Destinations**
2. Create each destination listed above with the exact names:
   - `HANA_DB_LMS`
   - `CPI_LMS`
   - `USER_API`
3. Test each destination to ensure connectivity
4. Save and activate

### 4. Configure Fiori Launchpad

1. Import the `flp-config.json` content into your Fiori Launchpad site
2. Assign the application to user groups
3. Publish the site changes

### 5. Test the Application

1. Access your Fiori Launchpad
2. Locate the "Workflow Log" tile
3. Click to launch the application
4. Verify that data loads correctly

---

## Troubleshooting

### Application Not Accessible in Launchpad

**Issue**: Tile appears but clicking shows 404 or blank page

**Solutions**:
- Verify the application ID in `flp-config.json` matches the manifest: `workflowLogManager.workflowLogManager`
- Check that the semantic object is `WorkflowLogManager` (case-sensitive)
- Ensure the application is properly deployed and running
- Check browser console for errors

### Destination Not Found Errors

**Issue**: 404 errors when accessing backend services

**Solutions**:
- Verify destination names exactly match those in `neo-app.json`:
  - `HANA_DB_LMS` (not `HANA_DB_DEV_LMS`)
  - `CPI_LMS` (not `CPI` or `CPI_DEV`)
  - `USER_API`
- Test destinations in BTP cockpit
- Check authentication credentials
- Verify URLs and ports are correct

### CORS or Authentication Errors

**Issue**: Cross-origin or 401/403 errors

**Solutions**:
- Ensure destinations have proper authentication configured
- Check that WebIDEEnabled property is set to true
- Verify user has necessary permissions in backend systems
- Check CSRF token handling if using state-changing operations

### Data Not Loading

**Issue**: Application loads but shows no data

**Solutions**:
- Check browser network tab for failed requests
- Verify OData service is accessible: `/lmsproject/hana/xsodata/WorkflowReportService.xsodata`
- Test CPI endpoints are responding
- Check user permissions in HANA and CPI systems
- Review application logs in BTP cockpit

---

## Environment-Specific Notes

### Development
- Uses mock data when running on `localhost`
- No destinations required for local development
- Mock server automatically activated

### Testing/Staging
- Configure destinations pointing to test/staging backends
- Use test credentials
- May require separate Fiori Launchpad site

### Production
- Configure destinations pointing to production backends
- Use secure credential storage (never hardcode passwords)
- Enable monitoring and logging
- Configure backup and disaster recovery

---

## Security Considerations

1. **Never commit credentials** to version control
2. **Use secure authentication** methods (OAuth2, SAML) where possible
3. **Regularly rotate** destination passwords
4. **Limit user permissions** to minimum required
5. **Enable audit logging** in production environments
6. **Use HTTPS** for all destination URLs
7. **Implement CSRF protection** for state-changing operations

---

## Support and Maintenance

### Monitoring

Monitor the following in SAP BTP Cockpit:
- Application availability
- Response times
- Error rates
- Destination connectivity

### Updating the Application

1. Make code changes in development
2. Test locally with mock data
3. Build and deploy to test environment
4. Validate with real destinations
5. Deploy to production during maintenance window
6. Verify functionality post-deployment

### Rollback Procedure

If deployment issues occur:

```bash
# Revert to previous version
neo rollback --host <region-host> --account <account-id> --application workflowlogmanager
```

---

## Additional Resources

- [SAP BTP Documentation](https://help.sap.com/viewer/product/BTP/Cloud/en-US)
- [SAP Fiori Launchpad Guide](https://help.sap.com/viewer/product/SAP_FIORI_LAUNCHPAD/Cloud/en-US)
- [Destination Configuration Guide](https://help.sap.com/viewer/cca91383641e40ffbe03bdc78f00f681/Cloud/en-US)
- [SAPUI5 SDK](https://sapui5.hana.ondemand.com/)

---

## Change Log

### Version 1.0.0 - 2025-10-24
- Initial deployment configuration
- Fixed Fiori Launchpad integration issues
- Standardized destination naming
- Consolidated CPI endpoints to single destination
- Added comprehensive deployment documentation
