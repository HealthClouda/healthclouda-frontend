openapi: 3.0.3
info:
  title: HealthClouda EHR API
  version: 1.0.0
  description: Multi-tenant Electronic Health Record System API with org-level data
    isolation, JWT auth, and HIPAA-compliant audit logging.
paths:
  /api/v1/audit/access-logs/:
    get:
      operationId: audit_access_logs_list
      description: |-
        Patient data access logs (compliance reporting).
        Superadmin only.
      parameters:
      - in: query
        name: access_type
        schema:
          type: string
          enum:
          - DOWNLOAD
          - EXPORT
          - PRINT
          - VIEW
        description: |-
          * `VIEW` - Viewed Record
          * `DOWNLOAD` - Downloaded Data
          * `PRINT` - Printed Record
          * `EXPORT` - Exported Data
      - in: query
        name: organization
        schema:
          type: string
          format: uuid
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - in: query
        name: patient
        schema:
          type: string
          format: uuid
      - in: query
        name: user
        schema:
          type: string
          format: uuid
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedDataAccessLogList'
          description: ''
  /api/v1/audit/access-logs/{id}/:
    get:
      operationId: audit_access_logs_retrieve
      description: |-
        Patient data access logs (compliance reporting).
        Superadmin only.
      parameters:
      - in: path
        name: id
        schema:
          type: string
          format: uuid
        description: A UUID string identifying this data access log.
        required: true
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DataAccessLog'
          description: ''
  /api/v1/audit/logs/:
    get:
      operationId: audit_logs_list
      description: |-
        Audit log viewer (superadmin only).

        GET /api/v1/audit/logs/ - List all audit logs
        GET /api/v1/audit/logs/{id}/ - Get specific log

        Filters:
        - action (CREATE, UPDATE, DELETE, etc.)
        - resource_type (Patient, Episode, Referral)
        - user_email
        - organization
        - created_at (date range)
      parameters:
      - in: query
        name: action
        schema:
          type: string
          enum:
          - CREATE
          - DELETE
          - EXPORT
          - LOGIN
          - LOGIN_FAILURE
          - LOGOUT
          - PERMISSION_DENIED
          - PRINT
          - RATE_LIMITED
          - READ
          - SHARE
          - UPDATE
        description: |-
          * `CREATE` - Create
          * `READ` - Read/View
          * `UPDATE` - Update
          * `DELETE` - Delete
          * `LOGIN` - Login
          * `LOGOUT` - Logout
          * `LOGIN_FAILURE` - Login Failure
          * `PERMISSION_DENIED` - Permission Denied
          * `RATE_LIMITED` - Rate Limited
          * `EXPORT` - Data Export
          * `PRINT` - Print Record
          * `SHARE` - Share Data
      - in: query
        name: organization
        schema:
          type: string
          format: uuid
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - in: query
        name: resource_type
        schema:
          type: string
      - in: query
        name: user_email
        schema:
          type: string
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedAuditLogList'
          description: ''
  /api/v1/audit/logs/{id}/:
    get:
      operationId: audit_logs_retrieve
      description: |-
        Audit log viewer (superadmin only).

        GET /api/v1/audit/logs/ - List all audit logs
        GET /api/v1/audit/logs/{id}/ - Get specific log

        Filters:
        - action (CREATE, UPDATE, DELETE, etc.)
        - resource_type (Patient, Episode, Referral)
        - user_email
        - organization
        - created_at (date range)
      parameters:
      - in: path
        name: id
        schema:
          type: string
          format: uuid
        description: A UUID string identifying this audit log.
        required: true
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuditLog'
          description: ''
  /api/v1/audit/my-trail/:
    get:
      operationId: audit_my_trail_list
      description: |-
        Patient's own audit trail.
        Patients can see who accessed their data.

        GET /api/v1/audit/my-trail/ - Patient's own audit trail
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedPatientAuditTrailList'
          description: ''
  /api/v1/audit/my-trail/{id}/:
    get:
      operationId: audit_my_trail_retrieve
      description: |-
        Patient's own audit trail.
        Patients can see who accessed their data.

        GET /api/v1/audit/my-trail/ - Patient's own audit trail
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - audit
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PatientAuditTrail'
          description: ''
  /api/v1/auth/change-password/:
    post:
      operationId: auth_change_password_create
      description: |-
        Change user password.

        POST /api/v1/auth/change-password/
        Body: { "old_password": "old123", "new_password": "new123" }
        Headers: { "Authorization": "Bearer <access_token>" }
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/forgot-password/:
    post:
      operationId: auth_forgot_password_create
      description: |-
        Initiate password reset — sends a 6-digit OTP to the user's email.

        POST /api/v1/auth/forgot-password/
        Body: { "email": "user@example.com" }
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/login/:
    post:
      operationId: auth_login_create
      description: |-
        Login endpoint with path-based organization detection.

        POST /api/v1/auth/login/ (general portal - patients only)
        POST /api/v1/auth/login/<org_slug>/ (org portal - staff + patients)

        Examples:
            POST /api/v1/auth/login/
            POST /api/v1/auth/login/luth-hospital/
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/login/{org_slug}/:
    post:
      operationId: auth_login_create_2
      description: |-
        Login endpoint with path-based organization detection.

        POST /api/v1/auth/login/ (general portal - patients only)
        POST /api/v1/auth/login/<org_slug>/ (org portal - staff + patients)

        Examples:
            POST /api/v1/auth/login/
            POST /api/v1/auth/login/luth-hospital/
      parameters:
      - in: path
        name: org_slug
        schema:
          type: string
        required: true
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/login/admin/:
    post:
      operationId: auth_login_admin_create
      description: |-
        Dedicated login endpoint for superadmin only.
        Separated from general/org portals for security.

        POST /api/v1/auth/login/admin/
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/logout/:
    post:
      operationId: auth_logout_create
      description: |-
        Logout endpoint - blacklists refresh token.

        POST /api/v1/auth/logout/
        Body: { "refresh": "refresh_token" }
        Headers: { "Authorization": "Bearer <access_token>" }
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/me/:
    get:
      operationId: auth_me_retrieve
      description: |-
        Get current authenticated user details.

        GET /api/v1/auth/me/
        Headers: { "Authorization": "Bearer <access_token>" }
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/me/notifications/:
    get:
      operationId: auth_me_notifications_retrieve
      description: |-
        GET /api/v1/auth/me/notifications/
        List current user's staff notifications.
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/me/notifications/{notification_id}/read/:
    patch:
      operationId: auth_me_notifications_read_partial_update
      description: PATCH /api/v1/auth/me/notifications/<id>/read/
      parameters:
      - in: path
        name: notification_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/me/notifications/unread-count/:
    get:
      operationId: auth_me_notifications_unread_count_retrieve
      description: GET /api/v1/auth/me/notifications/unread-count/
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/me/toggle-duty/:
    post:
      operationId: auth_me_toggle_duty_create
      description: |-
        Toggle on-duty/off-duty status for the current doctor.

        POST /api/v1/auth/me/toggle-duty/
        Body: { "is_on_duty": true }
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/refresh/:
    post:
      operationId: auth_refresh_create
      description: |-
        Takes a refresh type JSON web token and returns an access type JSON web
        token if the refresh token is valid.
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TokenRefreshRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/TokenRefreshRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/TokenRefreshRequest'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenRefresh'
          description: ''
  /api/v1/auth/resend-otp/:
    post:
      operationId: auth_resend_otp_create
      description: |-
        Resend a new OTP to the same email.

        POST /api/v1/auth/resend-otp/
        Body: { "email": "user@example.com" }
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/reset-password/:
    post:
      operationId: auth_reset_password_create
      description: |-
        Set new password after OTP verification.

        POST /api/v1/auth/reset-password/
        Body: { "email": "user@example.com", "password": "New1!", "password2": "New1!" }
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/auth/users/:
    get:
      operationId: auth_users_list
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedUserListList'
          description: ''
    post:
      operationId: auth_users_create
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/UserCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/UserCreateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserCreate'
          description: ''
  /api/v1/auth/users/{id}/:
    get:
      operationId: auth_users_retrieve
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserDetail'
          description: ''
    put:
      operationId: auth_users_update
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/UserUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/UserUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserUpdate'
          description: ''
    patch:
      operationId: auth_users_partial_update
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedUserUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedUserUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedUserUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserUpdate'
          description: ''
    delete:
      operationId: auth_users_destroy
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/auth/users/{id}/activate/:
    post:
      operationId: auth_users_activate_create
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserDetail'
          description: ''
  /api/v1/auth/users/{id}/reset-password/:
    post:
      operationId: auth_users_reset_password_create
      description: |-
        User management endpoints (staff CRUD).

        Endpoints:
            GET    /api/v1/auth/users/                          List users
            POST   /api/v1/auth/users/                          Create user
            GET    /api/v1/auth/users/{id}/                     User details
            PUT    /api/v1/auth/users/{id}/                     Update user
            PATCH  /api/v1/auth/users/{id}/                     Partial update
            DELETE /api/v1/auth/users/{id}/                     Deactivate (soft delete)
            POST   /api/v1/auth/users/{id}/activate/            Reactivate user
            POST   /api/v1/auth/users/{id}/reset-password/      Admin reset password
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PasswordResetRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PasswordResetRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PasswordResetRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/auth/verify-otp/:
    post:
      operationId: auth_verify_otp_create
      description: |-
        Verify the 6-digit OTP code.

        POST /api/v1/auth/verify-otp/
        Body: { "email": "user@example.com", "code": "123456" }
      tags:
      - auth
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/contact/contact-form/:
    post:
      operationId: contact_contact_form_create
      description: |-
        POST /api/v1/contact/contact-form/

        Public endpoint for general landing page contact form.
      tags:
      - contact
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ContactUsRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ContactUsRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ContactUsRequest'
        required: true
      security:
      - jwtAuth: []
      - {}
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContactUs'
          description: ''
  /api/v1/contact/contact-list/:
    get:
      operationId: contact_contact_list_list
      description: |-
        GET /api/v1/contact/contact-list/

        List all general contact submissions.
        Only SUPERADMIN can view these (platform-level messages).
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - contact
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedContactUsList'
          description: ''
  /api/v1/doctor/appointments/:
    get:
      operationId: doctor_appointments_retrieve
      description: |-
        GET /api/v1/doctor/appointments/
        List doctor's appointments with filters.
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/appointments/{appointment_id}/:
    get:
      operationId: doctor_appointments_retrieve_2
      description: |-
        GET   /api/v1/doctor/appointments/<id>/    Detail
        PATCH /api/v1/doctor/appointments/<id>/    Update status + notes
      parameters:
      - in: path
        name: appointment_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: doctor_appointments_partial_update
      description: |-
        GET   /api/v1/doctor/appointments/<id>/    Detail
        PATCH /api/v1/doctor/appointments/<id>/    Update status + notes
      parameters:
      - in: path
        name: appointment_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/dashboard/stats/:
    get:
      operationId: doctor_dashboard_stats_retrieve
      description: |-
        GET /api/v1/doctor/dashboard/stats/
        Aggregated stats for the doctor's dashboard.
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/episodes/:
    get:
      operationId: doctor_episodes_retrieve
      description: |-
        GET  /api/v1/doctor/episodes/      List doctor's episodes
        POST /api/v1/doctor/episodes/      Create new episode
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: doctor_episodes_create
      description: |-
        GET  /api/v1/doctor/episodes/      List doctor's episodes
        POST /api/v1/doctor/episodes/      Create new episode
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/episodes/{episode_id}/:
    get:
      operationId: doctor_episodes_retrieve_2
      description: |-
        GET   /api/v1/doctor/episodes/<id>/    Full episode detail
        PATCH /api/v1/doctor/episodes/<id>/    Update episode
      parameters:
      - in: path
        name: episode_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: doctor_episodes_partial_update
      description: |-
        GET   /api/v1/doctor/episodes/<id>/    Full episode detail
        PATCH /api/v1/doctor/episodes/<id>/    Update episode
      parameters:
      - in: path
        name: episode_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/episodes/{episode_id}/complete/:
    post:
      operationId: doctor_episodes_complete_create
      description: |-
        POST /api/v1/doctor/episodes/<id>/complete/
        Close/complete an episode with final diagnosis.
      parameters:
      - in: path
        name: episode_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/episodes/{episode_id}/notes/:
    get:
      operationId: doctor_episodes_notes_retrieve
      description: |-
        GET  /api/v1/doctor/episodes/<id>/notes/     List notes
        POST /api/v1/doctor/episodes/<id>/notes/     Add note
      parameters:
      - in: path
        name: episode_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: doctor_episodes_notes_create
      description: |-
        GET  /api/v1/doctor/episodes/<id>/notes/     List notes
        POST /api/v1/doctor/episodes/<id>/notes/     Add note
      parameters:
      - in: path
        name: episode_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/my-patients/:
    get:
      operationId: doctor_my_patients_retrieve
      description: |-
        GET /api/v1/doctor/my-patients/
        Paginated list of episodes under this doctor with patient info,
        admission, and latest vitals.
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/patients/{patient_id}/vitals/:
    get:
      operationId: doctor_patients_vitals_retrieve
      description: |-
        GET /api/v1/doctor/patients/<id>/vitals/
        Current (latest) vitals for a patient at this org.
      parameters:
      - in: path
        name: patient_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/patients/{patient_id}/vitals/history/:
    get:
      operationId: doctor_patients_vitals_history_retrieve
      description: |-
        GET /api/v1/doctor/patients/<id>/vitals/history/
        Vitals history sorted ascending by recorded_at for charting.
      parameters:
      - in: path
        name: patient_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/prescriptions/:
    get:
      operationId: doctor_prescriptions_retrieve
      description: |-
        GET  /api/v1/doctor/prescriptions/     List prescriptions
        POST /api/v1/doctor/prescriptions/     Create prescription
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: doctor_prescriptions_create
      description: |-
        GET  /api/v1/doctor/prescriptions/     List prescriptions
        POST /api/v1/doctor/prescriptions/     Create prescription
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/prescriptions/{prescription_id}/cancel/:
    patch:
      operationId: doctor_prescriptions_cancel_partial_update
      description: |-
        PATCH /api/v1/doctor/prescriptions/<id>/cancel/
        Cancel an active prescription.
      parameters:
      - in: path
        name: prescription_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/:
    post:
      operationId: doctor_referrals_create
      description: |-
        POST /api/v1/doctor/referrals/
        Create referral (internal doctor-to-doctor or external org-to-org).
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/{referral_id}/:
    get:
      operationId: doctor_referrals_retrieve
      description: |-
        GET /api/v1/doctor/referrals/<id>/
        Referral detail (must involve this doctor or org).
      parameters:
      - in: path
        name: referral_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/{referral_id}/accept/:
    patch:
      operationId: doctor_referrals_accept_partial_update
      description: |-
        PATCH /api/v1/doctor/referrals/<id>/accept/
        Accept an incoming referral.
      parameters:
      - in: path
        name: referral_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/{referral_id}/decline/:
    patch:
      operationId: doctor_referrals_decline_partial_update
      description: |-
        PATCH /api/v1/doctor/referrals/<id>/decline/
        Decline an incoming referral with reason.
      parameters:
      - in: path
        name: referral_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/incoming/:
    get:
      operationId: doctor_referrals_incoming_retrieve
      description: |-
        GET /api/v1/doctor/referrals/incoming/
        Referrals sent TO this doctor (internal) or to this org (external).
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/doctor/referrals/outgoing/:
    get:
      operationId: doctor_referrals_outgoing_retrieve
      description: |-
        GET /api/v1/doctor/referrals/outgoing/
        Referrals sent BY this doctor.
      tags:
      - doctor
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/episodes/:
    get:
      operationId: episodes_list
      description: |-
        Episode CRUD with role-based field visibility.

        Endpoints:
            GET    /api/v1/episodes/              List episodes
            POST   /api/v1/episodes/              Create episode (doctor/nurse)
            GET    /api/v1/episodes/{id}/         Episode details
            PUT    /api/v1/episodes/{id}/         Update (doctor/nurse, ACTIVE only)
            PATCH  /api/v1/episodes/{id}/         Partial update
            DELETE /api/v1/episodes/{id}/         Delete (superadmin only)
            POST   /api/v1/episodes/{id}/close/   Close episode (doctor only)

        Field Visibility:
        - Doctors/Nurses: See ALL fields (including clinical_notes)
        - Patients: See limited fields (NO clinical_notes, NO treatment_plan)
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - episodes
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedEpisodeListList'
          description: ''
    post:
      operationId: episodes_create
      description: |-
        Episode CRUD with role-based field visibility.

        Endpoints:
            GET    /api/v1/episodes/              List episodes
            POST   /api/v1/episodes/              Create episode (doctor/nurse)
            GET    /api/v1/episodes/{id}/         Episode details
            PUT    /api/v1/episodes/{id}/         Update (doctor/nurse, ACTIVE only)
            PATCH  /api/v1/episodes/{id}/         Partial update
            DELETE /api/v1/episodes/{id}/         Delete (superadmin only)
            POST   /api/v1/episodes/{id}/close/   Close episode (doctor only)

        Field Visibility:
        - Doctors/Nurses: See ALL fields (including clinical_notes)
        - Patients: See limited fields (NO clinical_notes, NO treatment_plan)
      tags:
      - episodes
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EpisodeCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/EpisodeCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/EpisodeCreateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EpisodeCreate'
          description: ''
  /api/v1/episodes/{id}/:
    get:
      operationId: episodes_retrieve
      description: |-
        Episode CRUD with role-based field visibility.

        Endpoints:
            GET    /api/v1/episodes/              List episodes
            POST   /api/v1/episodes/              Create episode (doctor/nurse)
            GET    /api/v1/episodes/{id}/         Episode details
            PUT    /api/v1/episodes/{id}/         Update (doctor/nurse, ACTIVE only)
            PATCH  /api/v1/episodes/{id}/         Partial update
            DELETE /api/v1/episodes/{id}/         Delete (superadmin only)
            POST   /api/v1/episodes/{id}/close/   Close episode (doctor only)

        Field Visibility:
        - Doctors/Nurses: See ALL fields (including clinical_notes)
        - Patients: See limited fields (NO clinical_notes, NO treatment_plan)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - episodes
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    put:
      operationId: episodes_update
      description: |-
        Episode CRUD with role-based field visibility.

        Endpoints:
            GET    /api/v1/episodes/              List episodes
            POST   /api/v1/episodes/              Create episode (doctor/nurse)
            GET    /api/v1/episodes/{id}/         Episode details
            PUT    /api/v1/episodes/{id}/         Update (doctor/nurse, ACTIVE only)
            PATCH  /api/v1/episodes/{id}/         Partial update
            DELETE /api/v1/episodes/{id}/         Delete (superadmin only)
            POST   /api/v1/episodes/{id}/close/   Close episode (doctor only)

        Field Visibility:
        - Doctors/Nurses: See ALL fields (including clinical_notes)
        - Patients: See limited fields (NO clinical_notes, NO treatment_plan)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - episodes
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EpisodeUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/EpisodeUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/EpisodeUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EpisodeUpdate'
          description: ''
    patch:
      operationId: episodes_partial_update
      description: |-
        Episode CRUD with role-based field visibility.

        Endpoints:
            GET    /api/v1/episodes/              List episodes
            POST   /api/v1/episodes/              Create episode (doctor/nurse)
            GET    /api/v1/episodes/{id}/         Episode details
            PUT    /api/v1/episodes/{id}/         Update (doctor/nurse, ACTIVE only)
            PATCH  /api/v1/episodes/{id}/         Partial update
            DELETE /api/v1/episodes/{id}/         Delete (superadmin only)
            POST   /api/v1/episodes/{id}/close/   Close episode (doctor only)

        Field Visibility:
        - Doctors/Nurses: See ALL fields (including clinical_notes)
        - Patients: See limited fields (NO clinical_notes, NO treatment_plan)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - episodes
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedEpisodeUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedEpisodeUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedEpisodeUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EpisodeUpdate'
          description: ''
    delete:
      operationId: episodes_destroy
      description: Soft delete an episode (superadmin only).
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - episodes
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/episodes/{id}/close/:
    post:
      operationId: episodes_close_create
      description: |-
        Close an episode (mark as COMPLETED).
        Only DOCTOR can close episodes.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - episodes
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/health/:
    get:
      operationId: health_retrieve
      description: Health check endpoint for monitoring and load balancers
      tags:
      - health
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/nurse/dashboard/stats/:
    get:
      operationId: nurse_dashboard_stats_retrieve
      description: |-
        GET /api/v1/nurse/dashboard/stats/
        Aggregated ward and admission stats for the nurse's organization.
      tags:
      - nurse
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/nurse/my-patients/:
    get:
      operationId: nurse_my_patients_retrieve
      description: |-
        GET /api/v1/nurse/my-patients/
        Active admissions for the nurse's organization.
        Optional: ?ward_id=<uuid> to filter by specific ward.
      tags:
      - nurse
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/nurse/patients/{patient_id}/vitals/:
    get:
      operationId: nurse_patients_vitals_retrieve
      description: |-
        GET/PATCH /api/v1/nurse/patients/<patient_id>/vitals/
        Record or view vitals for a patient's active episode at the nurse's org.
      parameters:
      - in: path
        name: patient_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - nurse
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: nurse_patients_vitals_partial_update
      description: |-
        GET/PATCH /api/v1/nurse/patients/<patient_id>/vitals/
        Record or view vitals for a patient's active episode at the nurse's org.
      parameters:
      - in: path
        name: patient_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - nurse
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/nurse/wards/overview/:
    get:
      operationId: nurse_wards_overview_retrieve
      description: |-
        GET /api/v1/nurse/wards/overview/
        All wards with bed breakdown and active admission count.
      tags:
      - nurse
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org/:
    get:
      operationId: org_list
      description: |-
        Organization CRUD operations.

        Permissions:
        - LIST: Superadmin (all orgs), Org Admin (own org only)
        - CREATE: Superadmin only
        - RETRIEVE: Superadmin, Org Admin (own org)
        - UPDATE: Superadmin, Org Admin (own org)
        - DELETE: Superadmin only

        Endpoints:
            GET    /api/v1/organizations/        # List (superadmin sees all, org admin sees own)
            POST   /api/v1/organizations/        # Create (superadmin only)
            GET    /api/v1/organizations/{id}/   # Details
            PUT    /api/v1/organizations/{id}/   # Update
            DELETE /api/v1/organizations/{id}/   # Delete (superadmin only)
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - org
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedOrganizationListList'
          description: ''
    post:
      operationId: org_create
      description: |-
        Create new organization (Superadmin only).

        Organization slug is auto-generated from name.
        Organization ID (org_id) is auto-generated.
      tags:
      - org
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationDetail'
          description: ''
  /api/v1/org-admin/access-requests/:
    get:
      operationId: org_admin_access_requests_retrieve
      description: |-
        GET /api/v1/org-admin/access-requests/?status=
        Lists patient access requests for the organization.
      summary: List patient access requests
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/access-requests/{request_id}/review/:
    patch:
      operationId: org_admin_access_requests_review_partial_update
      description: |-
        PATCH /api/v1/org-admin/access-requests/<id>/review/
        Reviews a pending access request and sets APPROVED or DENIED.
      summary: Review patient access request
      parameters:
      - in: path
        name: request_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/activity/:
    get:
      operationId: org_admin_activity_retrieve
      description: |-
        GET /api/v1/org-admin/activity/
        Returns recent activity feed from audit logs for this organization.
      summary: Organization activity feed
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/beds/:
    get:
      operationId: org_admin_beds_retrieve
      description: |-
        GET /api/v1/org-admin/beds/?ward_id=
        Lists beds, optionally scoped to a ward.
      summary: List organization beds
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/dashboard/stats/:
    get:
      operationId: org_admin_dashboard_stats_retrieve
      description: |-
        GET /api/v1/org-admin/dashboard/stats/
        Returns summary statistics for organization admin dashboard cards.
      summary: Organization admin dashboard stats
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/patients/:
    get:
      operationId: org_admin_patients_retrieve
      description: |-
        GET /api/v1/org-admin/patients/?search=
        Lists organization-scoped patients with last visit metadata.
      summary: List organization patients
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/settings/:
    get:
      operationId: org_admin_settings_retrieve
      description: |-
        GET/PATCH /api/v1/org-admin/settings/
        Reads and updates organization support settings.
      summary: Get organization settings
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: org_admin_settings_partial_update
      description: |-
        GET/PATCH /api/v1/org-admin/settings/
        Reads and updates organization support settings.
      summary: Update organization settings
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/staff/:
    get:
      operationId: org_admin_staff_retrieve
      description: |-
        GET/POST /api/v1/org-admin/staff/
        List staff with filters, and create new staff users.
      summary: List organization staff
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: org_admin_staff_create
      description: |-
        GET/POST /api/v1/org-admin/staff/
        List staff with filters, and create new staff users.
      summary: Create staff account
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/staff/{staff_id}/status/:
    patch:
      operationId: org_admin_staff_status_partial_update
      description: |-
        PATCH /api/v1/org-admin/staff/<id>/status/
        Activate or deactivate an organization staff account.
      summary: Update staff active status
      parameters:
      - in: path
        name: staff_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org-admin/wards/overview/:
    get:
      operationId: org_admin_wards_overview_retrieve
      description: |-
        GET /api/v1/org-admin/wards/overview/
        Lists all wards in the organization with bed occupancy details.
      summary: Ward overview with beds
      tags:
      - org-admin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/org/{id}/:
    get:
      operationId: org_retrieve
      description: |-
        Organization CRUD operations.

        Permissions:
        - LIST: Superadmin (all orgs), Org Admin (own org only)
        - CREATE: Superadmin only
        - RETRIEVE: Superadmin, Org Admin (own org)
        - UPDATE: Superadmin, Org Admin (own org)
        - DELETE: Superadmin only

        Endpoints:
            GET    /api/v1/organizations/        # List (superadmin sees all, org admin sees own)
            POST   /api/v1/organizations/        # Create (superadmin only)
            GET    /api/v1/organizations/{id}/   # Details
            PUT    /api/v1/organizations/{id}/   # Update
            DELETE /api/v1/organizations/{id}/   # Delete (superadmin only)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - org
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationDetail'
          description: ''
    put:
      operationId: org_update
      description: |-
        Organization CRUD operations.

        Permissions:
        - LIST: Superadmin (all orgs), Org Admin (own org only)
        - CREATE: Superadmin only
        - RETRIEVE: Superadmin, Org Admin (own org)
        - UPDATE: Superadmin, Org Admin (own org)
        - DELETE: Superadmin only

        Endpoints:
            GET    /api/v1/organizations/        # List (superadmin sees all, org admin sees own)
            POST   /api/v1/organizations/        # Create (superadmin only)
            GET    /api/v1/organizations/{id}/   # Details
            PUT    /api/v1/organizations/{id}/   # Update
            DELETE /api/v1/organizations/{id}/   # Delete (superadmin only)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - org
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/OrganizationDetailRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationDetail'
          description: ''
    patch:
      operationId: org_partial_update
      description: |-
        Organization CRUD operations.

        Permissions:
        - LIST: Superadmin (all orgs), Org Admin (own org only)
        - CREATE: Superadmin only
        - RETRIEVE: Superadmin, Org Admin (own org)
        - UPDATE: Superadmin, Org Admin (own org)
        - DELETE: Superadmin only

        Endpoints:
            GET    /api/v1/organizations/        # List (superadmin sees all, org admin sees own)
            POST   /api/v1/organizations/        # Create (superadmin only)
            GET    /api/v1/organizations/{id}/   # Details
            PUT    /api/v1/organizations/{id}/   # Update
            DELETE /api/v1/organizations/{id}/   # Delete (superadmin only)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - org
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedOrganizationDetailRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedOrganizationDetailRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedOrganizationDetailRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationDetail'
          description: ''
    delete:
      operationId: org_destroy
      description: |-
        Soft delete organization (Superadmin only).

        Sets deleted_at timestamp instead of actually deleting.
        Also deactivates the organization.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - org
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/org/{slug}/contact/:
    post:
      operationId: org_contact_create
      description: |-
        POST /api/v1/org/<slug>/contact/

        Public endpoint for org landing page contact form.
        Anyone can submit a message to a specific organization.
        Organization is determined from the URL slug.
      parameters:
      - in: path
        name: slug
        schema:
          type: string
        required: true
      tags:
      - org
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrgContactCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/OrgContactCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/OrgContactCreateRequest'
        required: true
      security:
      - jwtAuth: []
      - {}
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrgContactCreate'
          description: ''
  /api/v1/org/by-slug/{slug}/:
    get:
      operationId: org_by_slug_retrieve
      description: |-
        Get organization branding details by slug.

        PUBLIC ENDPOINT - Used on login pages to display org name, logo, etc.

        GET /api/v1/organizations/by-slug/{slug}/

        Returns:
            200: Organization branding data
            404: Organization not found

        Example:
            GET /api/v1/organizations/by-slug/luth-hospital/

            Response:
            {
                "id": "uuid",
                "name": "LUTH Hospital",
                "slug": "luth-hospital",
                "org_id": "HCL-NG-LUTH-A3X7",
                "org_type": "HOSPITAL",
                "email_domain": "luth.edu",
                "logo_url": null
            }
      parameters:
      - in: path
        name: slug
        schema:
          type: string
        required: true
      tags:
      - org
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/org/contacts/:
    get:
      operationId: org_contacts_list
      description: |-
        GET /api/v1/org/contacts/

        List org contact submissions for dashboards.

        SUPERADMIN: Sees all org messages. Can filter with ?org_id=<uuid>
        ORG_ADMIN: Sees only their own org's messages.
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - org
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedOrgContactListList'
          description: ''
  /api/v1/patients/:
    get:
      operationId: patients_list
      description: |-
        Patient CRUD operations with role-based permissions.

        Permissions:
        - VIEW (GET): All staff members
        - CREATE (POST): SUPERADMIN, RECEPTIONIST only
        - UPDATE (PUT/PATCH):
            - SUPERADMIN, ORG_ADMIN: all fields
            - RECEPTIONIST: contact info only
            - DOCTOR, NURSE: medical info only
        - DELETE: SUPERADMIN, ORG_ADMIN only

        list:    GET  /api/v1/patients/
        create:  POST /api/v1/patients/  (RECEPTIONIST, SUPERADMIN only)
        retrieve: GET  /api/v1/patients/{id}/
        update:   PUT  /api/v1/patients/{id}/  (role-based field restrictions)
        partial_update: PATCH /api/v1/patients/{id}/  (role-based field restrictions)
        destroy:  DELETE /api/v1/patients/{id}/  (SUPERADMIN, ORG_ADMIN only)
        search:   GET  /api/v1/patients/search/?query=john
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedPatientListList'
          description: ''
    post:
      operationId: patients_create
      description: |-
        Create a new patient.

        PERMISSIONS: Only SUPERADMIN and RECEPTIONIST can create patients.

        FUTURE: Add payment validation here before creating patient.
      tags:
      - patients
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatientCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatientCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatientCreateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PatientCreate'
          description: ''
  /api/v1/patients/{id}/:
    get:
      operationId: patients_retrieve
      description: |-
        Patient CRUD operations with role-based permissions.

        Permissions:
        - VIEW (GET): All staff members
        - CREATE (POST): SUPERADMIN, RECEPTIONIST only
        - UPDATE (PUT/PATCH):
            - SUPERADMIN, ORG_ADMIN: all fields
            - RECEPTIONIST: contact info only
            - DOCTOR, NURSE: medical info only
        - DELETE: SUPERADMIN, ORG_ADMIN only

        list:    GET  /api/v1/patients/
        create:  POST /api/v1/patients/  (RECEPTIONIST, SUPERADMIN only)
        retrieve: GET  /api/v1/patients/{id}/
        update:   PUT  /api/v1/patients/{id}/  (role-based field restrictions)
        partial_update: PATCH /api/v1/patients/{id}/  (role-based field restrictions)
        destroy:  DELETE /api/v1/patients/{id}/  (SUPERADMIN, ORG_ADMIN only)
        search:   GET  /api/v1/patients/search/?query=john
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PatientDetail'
          description: ''
    put:
      operationId: patients_update
      description: |-
        Update patient details.

        PERMISSIONS:
        - SUPERADMIN, ORG_ADMIN: Can update all fields
        - RECEPTIONIST: Can update contact info only
        - DOCTOR, NURSE: Can update medical info only
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: patients_partial_update
      description: |-
        Patient CRUD operations with role-based permissions.

        Permissions:
        - VIEW (GET): All staff members
        - CREATE (POST): SUPERADMIN, RECEPTIONIST only
        - UPDATE (PUT/PATCH):
            - SUPERADMIN, ORG_ADMIN: all fields
            - RECEPTIONIST: contact info only
            - DOCTOR, NURSE: medical info only
        - DELETE: SUPERADMIN, ORG_ADMIN only

        list:    GET  /api/v1/patients/
        create:  POST /api/v1/patients/  (RECEPTIONIST, SUPERADMIN only)
        retrieve: GET  /api/v1/patients/{id}/
        update:   PUT  /api/v1/patients/{id}/  (role-based field restrictions)
        partial_update: PATCH /api/v1/patients/{id}/  (role-based field restrictions)
        destroy:  DELETE /api/v1/patients/{id}/  (SUPERADMIN, ORG_ADMIN only)
        search:   GET  /api/v1/patients/search/?query=john
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    delete:
      operationId: patients_destroy
      description: |-
        Soft delete a patient.

        PERMISSIONS: Only SUPERADMIN and ORG_ADMIN can delete patients.

        Sets deleted_at timestamp instead of actually deleting.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/patients/{id}/episodes/:
    get:
      operationId: patients_episodes_retrieve
      description: |-
        Get patient's episode history in current organization.

        PERMISSIONS: All staff members can view episodes.

        GET /api/v1/patients/{id}/episodes/
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PatientDetail'
          description: ''
  /api/v1/patients/me/:
    get:
      operationId: patients_me_retrieve
      description: |-
        Patient self-service profile endpoint.

        GET /api/v1/patients/me/ — Get own profile
        PATCH /api/v1/patients/me/ — Update contact info
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: patients_me_partial_update
      description: |-
        Patient self-service profile endpoint.

        GET /api/v1/patients/me/ — Get own profile
        PATCH /api/v1/patients/me/ — Update contact info
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/access-requests/:
    get:
      operationId: patients_me_access_requests_retrieve
      description: |-
        List access requests for the authenticated patient.

        GET /api/v1/patients/me/access-requests/
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/access-requests/{request_id}/:
    patch:
      operationId: patients_me_access_requests_partial_update
      description: |-
        Patient grants or denies an access request.

        PATCH /api/v1/patients/me/access-requests/<uuid:request_id>/
        Body: { "action": "grant" } or { "action": "deny" }
      parameters:
      - in: path
        name: request_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/dashboard/:
    get:
      operationId: patients_me_dashboard_retrieve
      description: |-
        Patient dashboard stats.

        GET /api/v1/patients/me/dashboard/
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/notifications/:
    get:
      operationId: patients_me_notifications_retrieve
      description: |-
        List patient's notifications.

        GET /api/v1/patients/me/notifications/
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/notifications/{notification_id}/read/:
    patch:
      operationId: patients_me_notifications_read_partial_update
      description: PATCH /api/v1/patients/me/notifications/{id}/read/
      parameters:
      - in: path
        name: notification_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/notifications/read-all/:
    post:
      operationId: patients_me_notifications_read_all_create
      description: POST /api/v1/patients/me/notifications/read-all/
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/me/notifications/unread-count/:
    get:
      operationId: patients_me_notifications_unread_count_retrieve
      description: GET /api/v1/patients/me/notifications/unread-count/
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/patients/search/:
    get:
      operationId: patients_search_retrieve
      description: |-
        Search patients by name, email, phone, or HealthClouda ID.

        PERMISSIONS: All staff members can search.

        GET /api/v1/patients/search/?query=john
        GET /api/v1/patients/search/?query=HCL-NG-
        GET /api/v1/patients/search/?query=john@example.com
      tags:
      - patients
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PatientDetail'
          description: ''
  /api/v1/receptionist/access-requests/:
    get:
      operationId: receptionist_access_requests_retrieve
      description: |-
        GET  /api/v1/receptionist/access-requests/     List requests for this org
        POST /api/v1/receptionist/access-requests/     Create request (sends email)
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: receptionist_access_requests_create
      description: |-
        GET  /api/v1/receptionist/access-requests/     List requests for this org
        POST /api/v1/receptionist/access-requests/     Create request (sends email)
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/access-requests/respond/:
    get:
      operationId: receptionist_access_requests_respond_retrieve
      description: |-
        GET /api/v1/receptionist/access-requests/respond/?token=<uuid>&action=accept|deny
        Public endpoint — patient clicks link from email.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/appointments/:
    get:
      operationId: receptionist_appointments_retrieve
      description: |-
        GET  /api/v1/receptionist/appointments/     List appointments
        POST /api/v1/receptionist/appointments/     Book appointment
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: receptionist_appointments_create
      description: |-
        GET  /api/v1/receptionist/appointments/     List appointments
        POST /api/v1/receptionist/appointments/     Book appointment
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/appointments/{appointment_id}/:
    get:
      operationId: receptionist_appointments_retrieve_2
      description: |-
        GET   /api/v1/receptionist/appointments/<id>/    Detail
        PATCH /api/v1/receptionist/appointments/<id>/    Update/cancel
      parameters:
      - in: path
        name: appointment_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: receptionist_appointments_partial_update
      description: |-
        GET   /api/v1/receptionist/appointments/<id>/    Detail
        PATCH /api/v1/receptionist/appointments/<id>/    Update/cancel
      parameters:
      - in: path
        name: appointment_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/assign-doctor/:
    post:
      operationId: receptionist_assign_doctor_create
      description: |-
        POST /api/v1/receptionist/assign-doctor/
        Creates an episode for the patient with the assigned doctor.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/check-ins/:
    get:
      operationId: receptionist_check_ins_retrieve
      description: |-
        GET  /api/v1/receptionist/check-ins/     List today's check-ins
        POST /api/v1/receptionist/check-ins/     Check in a patient
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    post:
      operationId: receptionist_check_ins_create
      description: |-
        GET  /api/v1/receptionist/check-ins/     List today's check-ins
        POST /api/v1/receptionist/check-ins/     Check in a patient
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/check-ins/{checkin_id}/:
    get:
      operationId: receptionist_check_ins_retrieve_2
      description: |-
        GET   /api/v1/receptionist/check-ins/<id>/    Detail
        PATCH /api/v1/receptionist/check-ins/<id>/    Update status
      parameters:
      - in: path
        name: checkin_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
    patch:
      operationId: receptionist_check_ins_partial_update
      description: |-
        GET   /api/v1/receptionist/check-ins/<id>/    Detail
        PATCH /api/v1/receptionist/check-ins/<id>/    Update status
      parameters:
      - in: path
        name: checkin_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/dashboard/stats/:
    get:
      operationId: receptionist_dashboard_stats_retrieve
      description: |-
        GET /api/v1/receptionist/dashboard/stats/
        Returns aggregated stats for the receptionist dashboard.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/doctors/on-duty/:
    get:
      operationId: receptionist_doctors_on_duty_retrieve
      description: |-
        GET /api/v1/receptionist/doctors/on-duty/
        List all on-duty doctors at this organization.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/emergency-beds/:
    get:
      operationId: receptionist_emergency_beds_retrieve
      description: |-
        GET /api/v1/receptionist/emergency-beds/
        Overview of emergency ward bed availability.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/patients/search/:
    get:
      operationId: receptionist_patients_search_retrieve
      description: |-
        GET /api/v1/receptionist/patients/search/?query=john
        Searches ALL patients (not org-scoped). Annotates with org-visit flags.
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/receptionist/referrals/{referral_id}/notify-doctors/:
    post:
      operationId: receptionist_referrals_notify_doctors_create
      description: |-
        POST /api/v1/receptionist/referrals/<referral_id>/notify-doctors/
        Send notifications to on-duty doctors about an incoming referral.
      parameters:
      - in: path
        name: referral_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - receptionist
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/referrals/:
    get:
      operationId: referrals_list
      description: |-
        Referral management endpoints.

        Privacy-compliant: receiving hospital gets LETTER only, NOT episode access.
        Three parties can access the letter: sending org, receiving org, and patient.
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedReferralListList'
          description: ''
    post:
      operationId: referrals_create
      description: Create new referral with automatic PDF letter generation.
      tags:
      - referrals
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReferralCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ReferralCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ReferralCreateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralCreate'
          description: ''
  /api/v1/referrals/{id}/:
    get:
      operationId: referrals_retrieve
      description: |-
        Referral management endpoints.

        Privacy-compliant: receiving hospital gets LETTER only, NOT episode access.
        Three parties can access the letter: sending org, receiving org, and patient.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/{id}/accept/:
    post:
      operationId: referrals_accept_create
      description: |-
        Accept referral (receiving doctor only).
        Optionally creates an episode at receiving organization.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralResponse'
          description: ''
  /api/v1/referrals/{id}/cancel/:
    post:
      operationId: referrals_cancel_create
      description: Cancel referral (sending doctor only, PENDING only).
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/{id}/complete/:
    post:
      operationId: referrals_complete_create
      description: Mark referral as completed (receiving doctor only).
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ReferralDetailRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/{id}/decline/:
    post:
      operationId: referrals_decline_create
      description: Decline referral (receiving doctor only).
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/ReferralResponseRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralResponse'
          description: ''
  /api/v1/referrals/{id}/download-letter/:
    get:
      operationId: referrals_download_letter_retrieve
      description: |-
        Download referral letter PDF.

        Accessible by sending org staff, receiving org staff,
        the patient, and superadmin.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/my-referrals/:
    get:
      operationId: referrals_my_referrals_retrieve
      description: Patient's own referrals.
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/received/:
    get:
      operationId: referrals_received_retrieve
      description: List referrals received by my organization.
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/referrals/sent/:
    get:
      operationId: referrals_sent_retrieve
      description: List referrals sent by my organization.
      tags:
      - referrals
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReferralDetail'
          description: ''
  /api/v1/superadmin/activity/:
    get:
      operationId: superadmin_activity_retrieve
      description: |-
        GET /api/v1/superadmin/activity/

        Returns recent system activity.

        Query params:
        - limit (default 50, max 200)
        - days (default 7)
        - type (users, patients, episodes, referrals, all)
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/superadmin/health/:
    get:
      operationId: superadmin_health_retrieve
      description: |-
        GET /api/v1/superadmin/health/

        Returns system health status including database connection,
        Python/Django versions, and record counts.
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/superadmin/organizations/{org_id}/activate/:
    post:
      operationId: superadmin_organizations_activate_create
      description: |-
        POST /api/v1/superadmin/organizations/{org_id}/activate/

        Reactivate a suspended organization.
        Also reactivates all non-deleted staff members.
      parameters:
      - in: path
        name: org_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/superadmin/organizations/{org_id}/suspend/:
    post:
      operationId: superadmin_organizations_suspend_create
      description: |-
        POST /api/v1/superadmin/organizations/{org_id}/suspend/

        Suspend an organization (set is_active=False).
        Also deactivates all staff members to prevent logins.
      parameters:
      - in: path
        name: org_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/superadmin/organizations/{org_id}/verify/:
    post:
      operationId: superadmin_organizations_verify_create
      description: |-
        POST /api/v1/superadmin/organizations/{org_id}/verify/

        Verify an organization (set is_verified=True).
        Records who verified it and when.
      parameters:
      - in: path
        name: org_id
        schema:
          type: string
          format: uuid
        required: true
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/superadmin/stats/:
    get:
      operationId: superadmin_stats_retrieve
      description: |-
        GET /api/v1/superadmin/stats/

        Returns system-wide statistics for superadmin dashboard.
      tags:
      - superadmin
      security:
      - jwtAuth: []
      responses:
        '200':
          description: No response body
  /api/v1/ward/:
    get:
      operationId: ward_list
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedWardListList'
          description: ''
    post:
      operationId: ward_create
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WardCreateUpdate'
          description: ''
  /api/v1/ward/{id}/:
    get:
      operationId: ward_retrieve
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WardDetail'
          description: ''
    put:
      operationId: ward_update
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/WardCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WardCreateUpdate'
          description: ''
    patch:
      operationId: ward_partial_update
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedWardCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedWardCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedWardCreateUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WardCreateUpdate'
          description: ''
    delete:
      operationId: ward_destroy
      description: |-
        Ward management endpoints.

        GET    /api/v1/ward/              List wards
        POST   /api/v1/ward/              Create ward
        GET    /api/v1/ward/{id}/          Ward detail
        PUT    /api/v1/ward/{id}/          Update ward
        PATCH  /api/v1/ward/{id}/          Partial update
        DELETE /api/v1/ward/{id}/          Soft delete ward
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/ward/admissions/:
    get:
      operationId: ward_admissions_list
      description: |-
        Admission management endpoints.

        GET    /api/v1/ward/admissions/                    List admissions
        POST   /api/v1/ward/admissions/                    Admit patient
        GET    /api/v1/ward/admissions/{id}/                Admission detail
        POST   /api/v1/ward/admissions/{id}/discharge/      Discharge patient
        POST   /api/v1/ward/admissions/{id}/transfer/       Transfer to different bed

        Query params:
        - status: Filter by admission status (ACTIVE, DISCHARGED, TRANSFERRED)
        - ward_id: Filter by ward
        - patient_id: Filter by patient
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedAdmissionListList'
          description: ''
    post:
      operationId: ward_admissions_create
      description: |-
        Admission management endpoints.

        GET    /api/v1/ward/admissions/                    List admissions
        POST   /api/v1/ward/admissions/                    Admit patient
        GET    /api/v1/ward/admissions/{id}/                Admission detail
        POST   /api/v1/ward/admissions/{id}/discharge/      Discharge patient
        POST   /api/v1/ward/admissions/{id}/transfer/       Transfer to different bed

        Query params:
        - status: Filter by admission status (ACTIVE, DISCHARGED, TRANSFERRED)
        - ward_id: Filter by ward
        - patient_id: Filter by patient
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdmissionCreateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/AdmissionCreateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/AdmissionCreateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdmissionCreate'
          description: ''
  /api/v1/ward/admissions/{id}/:
    get:
      operationId: ward_admissions_retrieve
      description: |-
        Admission management endpoints.

        GET    /api/v1/ward/admissions/                    List admissions
        POST   /api/v1/ward/admissions/                    Admit patient
        GET    /api/v1/ward/admissions/{id}/                Admission detail
        POST   /api/v1/ward/admissions/{id}/discharge/      Discharge patient
        POST   /api/v1/ward/admissions/{id}/transfer/       Transfer to different bed

        Query params:
        - status: Filter by admission status (ACTIVE, DISCHARGED, TRANSFERRED)
        - ward_id: Filter by ward
        - patient_id: Filter by patient
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdmissionDetail'
          description: ''
  /api/v1/ward/admissions/{id}/discharge/:
    post:
      operationId: ward_admissions_discharge_create
      description: Discharge a patient from their bed.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DischargeRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/DischargeRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/DischargeRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Discharge'
          description: ''
  /api/v1/ward/admissions/{id}/transfer/:
    post:
      operationId: ward_admissions_transfer_create
      description: Transfer a patient to a different bed.
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TransferRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/TransferRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/TransferRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Transfer'
          description: ''
  /api/v1/ward/beds/:
    get:
      operationId: ward_beds_list
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedBedListList'
          description: ''
    post:
      operationId: ward_beds_create
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BedCreateUpdate'
          description: ''
  /api/v1/ward/beds/{id}/:
    get:
      operationId: ward_beds_retrieve
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BedList'
          description: ''
    put:
      operationId: ward_beds_update
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/BedCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BedCreateUpdate'
          description: ''
    patch:
      operationId: ward_beds_partial_update
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedBedCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedBedCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedBedCreateUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BedCreateUpdate'
          description: ''
    delete:
      operationId: ward_beds_destroy
      description: |-
        Bed management endpoints.

        GET    /api/v1/ward/beds/              List beds
        POST   /api/v1/ward/beds/              Create bed
        GET    /api/v1/ward/beds/{id}/          Bed detail
        PUT    /api/v1/ward/beds/{id}/          Update bed
        PATCH  /api/v1/ward/beds/{id}/          Partial update
        DELETE /api/v1/ward/beds/{id}/          Soft delete bed

        Query params:
        - ward_id: Filter beds by ward
        - room_id: Filter beds by room
        - status: Filter by bed status (AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
  /api/v1/ward/rooms/:
    get:
      operationId: ward_rooms_list
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      parameters:
      - name: ordering
        required: false
        in: query
        description: Which field to use when ordering the results.
        schema:
          type: string
      - name: page
        required: false
        in: query
        description: A page number within the paginated result set.
        schema:
          type: integer
      - name: search
        required: false
        in: query
        description: A search term.
        schema:
          type: string
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedRoomListList'
          description: ''
    post:
      operationId: ward_rooms_create
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoomCreateUpdate'
          description: ''
  /api/v1/ward/rooms/{id}/:
    get:
      operationId: ward_rooms_retrieve
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoomDetail'
          description: ''
    put:
      operationId: ward_rooms_update
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/RoomCreateUpdateRequest'
        required: true
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoomCreateUpdate'
          description: ''
    patch:
      operationId: ward_rooms_partial_update
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatchedRoomCreateUpdateRequest'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PatchedRoomCreateUpdateRequest'
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/PatchedRoomCreateUpdateRequest'
      security:
      - jwtAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoomCreateUpdate'
          description: ''
    delete:
      operationId: ward_rooms_destroy
      description: |-
        Room management endpoints.

        GET    /api/v1/ward/rooms/              List rooms
        POST   /api/v1/ward/rooms/              Create room
        GET    /api/v1/ward/rooms/{id}/          Room detail
        PUT    /api/v1/ward/rooms/{id}/          Update room
        PATCH  /api/v1/ward/rooms/{id}/          Partial update
        DELETE /api/v1/ward/rooms/{id}/          Soft delete room
      parameters:
      - in: path
        name: id
        schema:
          type: string
        required: true
      tags:
      - ward
      security:
      - jwtAuth: []
      responses:
        '204':
          description: No response body
components:
  schemas:
    AccessTypeEnum:
      enum:
      - VIEW
      - DOWNLOAD
      - PRINT
      - EXPORT
      type: string
      description: |-
        * `VIEW` - Viewed Record
        * `DOWNLOAD` - Downloaded Data
        * `PRINT` - Printed Record
        * `EXPORT` - Exported Data
    ActionEnum:
      enum:
      - CREATE
      - READ
      - UPDATE
      - DELETE
      - LOGIN
      - LOGOUT
      - LOGIN_FAILURE
      - PERMISSION_DENIED
      - RATE_LIMITED
      - EXPORT
      - PRINT
      - SHARE
      type: string
      description: |-
        * `CREATE` - Create
        * `READ` - Read/View
        * `UPDATE` - Update
        * `DELETE` - Delete
        * `LOGIN` - Login
        * `LOGOUT` - Logout
        * `LOGIN_FAILURE` - Login Failure
        * `PERMISSION_DENIED` - Permission Denied
        * `RATE_LIMITED` - Rate Limited
        * `EXPORT` - Data Export
        * `PRINT` - Print Record
        * `SHARE` - Share Data
    AdmissionCreate:
      type: object
      properties:
        patient:
          type: string
          format: uuid
        episode:
          type: string
          format: uuid
        bed:
          type: string
          format: uuid
        admission_reason:
          type: string
          description: Why patient was admitted
      required:
      - bed
      - episode
      - patient
    AdmissionCreateRequest:
      type: object
      properties:
        patient:
          type: string
          format: uuid
        episode:
          type: string
          format: uuid
        bed:
          type: string
          format: uuid
        admission_reason:
          type: string
          description: Why patient was admitted
      required:
      - bed
      - episode
      - patient
    AdmissionDetail:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        patient:
          allOf:
          - $ref: '#/components/schemas/PatientNested'
          readOnly: true
        bed:
          allOf:
          - $ref: '#/components/schemas/BedNested'
          readOnly: true
        status:
          $ref: '#/components/schemas/Status897Enum'
        admitted_at:
          type: string
          format: date-time
          readOnly: true
        admitted_by:
          allOf:
          - $ref: '#/components/schemas/UserNested'
          readOnly: true
        admission_reason:
          type: string
          description: Why patient was admitted
        discharged_at:
          type: string
          format: date-time
          nullable: true
        length_of_stay:
          type: string
          readOnly: true
        episode:
          type: string
          format: uuid
        discharged_by:
          allOf:
          - $ref: '#/components/schemas/UserNested'
          readOnly: true
        discharge_summary:
          type: string
          description: Summary of treatment and outcome
        discharge_instructions:
          type: string
          description: Instructions for patient after discharge
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - admitted_at
      - admitted_by
      - bed
      - created_at
      - discharged_by
      - episode
      - id
      - length_of_stay
      - patient
      - updated_at
    AdmissionList:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        patient:
          allOf:
          - $ref: '#/components/schemas/PatientNested'
          readOnly: true
        bed:
          allOf:
          - $ref: '#/components/schemas/BedNested'
          readOnly: true
        status:
          $ref: '#/components/schemas/Status897Enum'
        admitted_at:
          type: string
          format: date-time
          readOnly: true
        admitted_by:
          allOf:
          - $ref: '#/components/schemas/UserNested'
          readOnly: true
        admission_reason:
          type: string
          description: Why patient was admitted
        discharged_at:
          type: string
          format: date-time
          nullable: true
        length_of_stay:
          type: string
          readOnly: true
      required:
      - admitted_at
      - admitted_by
      - bed
      - id
      - length_of_stay
      - patient
    AuditLog:
      type: object
      description: Serialize audit logs for API responses
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        user_email:
          type: string
          readOnly: true
        user_role:
          type: string
          readOnly: true
        action:
          allOf:
          - $ref: '#/components/schemas/ActionEnum'
          readOnly: true
        resource_type:
          type: string
          readOnly: true
          description: Model name (e.g., 'Patient', 'Episode', 'Referral')
        resource_id:
          type: string
          readOnly: true
          description: ID of the affected record (UUID string or descriptor like 'bulk')
        resource_repr:
          type: string
          readOnly: true
        reason:
          type: string
          readOnly: true
          description: Why this action was taken (e.g., 'Emergency access', 'Patient
            consent given')
        ip_address:
          type: string
          readOnly: true
          nullable: true
          description: IP address of the user
        created_at:
          type: string
          format: date-time
          readOnly: true
        changes:
          readOnly: true
          description: 'Field-level changes: {''field'': {''old'': ''...'', ''new'':
            ''...''}}'
        metadata:
          readOnly: true
          description: Any additional context
      required:
      - action
      - changes
      - created_at
      - id
      - ip_address
      - metadata
      - reason
      - resource_id
      - resource_repr
      - resource_type
      - user_email
      - user_role
    BedCreateUpdate:
      type: object
      properties:
        bed_number:
          type: string
          maxLength: 20
        status:
          $ref: '#/components/schemas/StatusAc8Enum'
        ward:
          type: string
          format: uuid
          nullable: true
        room:
          type: string
          format: uuid
          nullable: true
      required:
      - bed_number
    BedCreateUpdateRequest:
      type: object
      properties:
        bed_number:
          type: string
          minLength: 1
          maxLength: 20
        status:
          $ref: '#/components/schemas/StatusAc8Enum'
        ward:
          type: string
          format: uuid
          nullable: true
        room:
          type: string
          format: uuid
          nullable: true
      required:
      - bed_number
    BedList:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        bed_number:
          type: string
          maxLength: 20
        status:
          $ref: '#/components/schemas/StatusAc8Enum'
        ward:
          allOf:
          - $ref: '#/components/schemas/WardNested'
          readOnly: true
        room:
          allOf:
          - $ref: '#/components/schemas/RoomNested'
          readOnly: true
        current_patient:
          allOf:
          - $ref: '#/components/schemas/PatientNested'
          readOnly: true
        assigned_at:
          type: string
          format: date-time
          nullable: true
          description: When patient was assigned to this bed
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - bed_number
      - created_at
      - current_patient
      - id
      - room
      - ward
    BedNested:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        bed_number:
          type: string
          maxLength: 20
        status:
          $ref: '#/components/schemas/StatusAc8Enum'
        ward:
          allOf:
          - $ref: '#/components/schemas/WardNested'
          readOnly: true
        room:
          allOf:
          - $ref: '#/components/schemas/RoomNested'
          readOnly: true
      required:
      - bed_number
      - id
      - room
      - ward
    BlankEnum:
      enum:
      - ''
    CategoryEnum:
      enum:
      - MEDICAL
      - SURGICAL
      - EMERGENCY
      - GYNAECOLOGY
      - PAEDIATRIC
      - ICU
      - MATERNITY
      - OTHER
      type: string
      description: |-
        * `MEDICAL` - Medical
        * `SURGICAL` - Surgical
        * `EMERGENCY` - Emergency
        * `GYNAECOLOGY` - Gynaecology
        * `PAEDIATRIC` - Paediatric
        * `ICU` - Intensive Care Unit
        * `MATERNITY` - Maternity
        * `OTHER` - Other
    ContactUs:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
        email:
          type: string
          format: email
          maxLength: 254
        phone_number:
          type: string
          maxLength: 15
        message:
          type: string
          maxLength: 500
      required:
      - email
      - first_name
      - id
      - last_name
      - message
      - phone_number
    ContactUsRequest:
      type: object
      properties:
        first_name:
          type: string
          minLength: 1
          maxLength: 100
        last_name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
          minLength: 1
          maxLength: 254
        phone_number:
          type: string
          minLength: 1
          maxLength: 15
        message:
          type: string
          minLength: 1
          maxLength: 500
      required:
      - email
      - first_name
      - last_name
      - message
      - phone_number
    DataAccessLog:
      type: object
      description: Serialize patient data access logs
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        user_email:
          type: string
          readOnly: true
        patient_name:
          type: string
          readOnly: true
        access_type:
          allOf:
          - $ref: '#/components/schemas/AccessTypeEnum'
          readOnly: true
        accessed_at:
          type: string
          format: date-time
          readOnly: true
        ip_address:
          type: string
          readOnly: true
          nullable: true
      required:
      - access_type
      - accessed_at
      - id
      - ip_address
      - patient_name
      - user_email
    Discharge:
      type: object
      properties:
        discharge_summary:
          type: string
          default: ''
        discharge_instructions:
          type: string
          default: ''
    DischargeRequest:
      type: object
      properties:
        discharge_summary:
          type: string
          default: ''
        discharge_instructions:
          type: string
          default: ''
    EpisodeCreate:
      type: object
      description: |-
        Serializer for creating new episodes.
        Organization is auto-set from the logged-in user.
      properties:
        patient:
          type: string
          format: uuid
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint:
          type: string
          description: Reason for visit (patient can see)
        diagnosis:
          type: string
          description: Medical diagnosis (patient can see)
        prescribed_drugs:
          type: string
          description: Medications prescribed (patient can see)
        patient_instructions:
          type: string
          description: Instructions for patient in simple language (patient can see)
        vitals:
          nullable: true
          description: 'Vital signs: BP, temp, pulse, weight, etc. (patient can see)'
        clinical_notes:
          type: string
          description: Internal clinical observations (DOCTOR/NURSE ONLY)
        treatment_plan:
          type: string
          description: Detailed treatment plan (DOCTOR/NURSE ONLY)
      required:
      - patient
    EpisodeCreateRequest:
      type: object
      description: |-
        Serializer for creating new episodes.
        Organization is auto-set from the logged-in user.
      properties:
        patient:
          type: string
          format: uuid
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint:
          type: string
          description: Reason for visit (patient can see)
        diagnosis:
          type: string
          description: Medical diagnosis (patient can see)
        prescribed_drugs:
          type: string
          description: Medications prescribed (patient can see)
        patient_instructions:
          type: string
          description: Instructions for patient in simple language (patient can see)
        vitals:
          nullable: true
          description: 'Vital signs: BP, temp, pulse, weight, etc. (patient can see)'
        clinical_notes:
          type: string
          description: Internal clinical observations (DOCTOR/NURSE ONLY)
        treatment_plan:
          type: string
          description: Detailed treatment plan (DOCTOR/NURSE ONLY)
      required:
      - patient
    EpisodeList:
      type: object
      description: |-
        Lightweight serializer for episode list view.
        Shows summary info for performance.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        patient:
          allOf:
          - $ref: '#/components/schemas/EpisodePatientNested'
          readOnly: true
        organization:
          allOf:
          - $ref: '#/components/schemas/EpisodeOrgNested'
          readOnly: true
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint_summary:
          type: string
          readOnly: true
        diagnosis_summary:
          type: string
          readOnly: true
        status:
          allOf:
          - $ref: '#/components/schemas/EpisodeListStatusEnum'
          default: ACTIVE
        episode_start:
          type: string
          format: date-time
          readOnly: true
        episode_end:
          type: string
          format: date-time
          nullable: true
      required:
      - chief_complaint_summary
      - diagnosis_summary
      - episode_start
      - id
      - organization
      - patient
    EpisodeListStatusEnum:
      enum:
      - ACTIVE
      - COMPLETED
      type: string
      description: |-
        * `ACTIVE` - Active
        * `COMPLETED` - Completed
    EpisodeOrgNested:
      type: object
      description: Lightweight org info for episode views.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          description: Official organization name
          maxLength: 200
        org_id:
          type: string
          readOnly: true
          description: 'Unique org ID in format: HCL-{COUNTRY}-{SLUG}-{RANDOM}'
      required:
      - id
      - name
      - org_id
    EpisodePatientNested:
      type: object
      description: Lightweight patient info for episode list views.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        healthclouda_id:
          type: string
          description: Unique Healthclouda ID (HCL-XXXXXX format)
          maxLength: 20
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
      required:
      - first_name
      - healthclouda_id
      - id
      - last_name
    EpisodeTypeEnum:
      enum:
      - OUTPATIENT
      - INPATIENT
      - EMERGENCY
      - CONSULTATION
      type: string
      description: |-
        * `OUTPATIENT` - Outpatient
        * `INPATIENT` - Inpatient
        * `EMERGENCY` - Emergency
        * `CONSULTATION` - Consultation
    EpisodeUpdate:
      type: object
      description: |-
        Serializer for updating episodes.
        Cannot change patient, organization, or episode_start.
      properties:
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint:
          type: string
          description: Reason for visit (patient can see)
        diagnosis:
          type: string
          description: Medical diagnosis (patient can see)
        prescribed_drugs:
          type: string
          description: Medications prescribed (patient can see)
        patient_instructions:
          type: string
          description: Instructions for patient in simple language (patient can see)
        vitals:
          nullable: true
          description: 'Vital signs: BP, temp, pulse, weight, etc. (patient can see)'
        clinical_notes:
          type: string
          description: Internal clinical observations (DOCTOR/NURSE ONLY)
        treatment_plan:
          type: string
          description: Detailed treatment plan (DOCTOR/NURSE ONLY)
    EpisodeUpdateRequest:
      type: object
      description: |-
        Serializer for updating episodes.
        Cannot change patient, organization, or episode_start.
      properties:
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint:
          type: string
          description: Reason for visit (patient can see)
        diagnosis:
          type: string
          description: Medical diagnosis (patient can see)
        prescribed_drugs:
          type: string
          description: Medications prescribed (patient can see)
        patient_instructions:
          type: string
          description: Instructions for patient in simple language (patient can see)
        vitals:
          nullable: true
          description: 'Vital signs: BP, temp, pulse, weight, etc. (patient can see)'
        clinical_notes:
          type: string
          description: Internal clinical observations (DOCTOR/NURSE ONLY)
        treatment_plan:
          type: string
          description: Detailed treatment plan (DOCTOR/NURSE ONLY)
    Gender10eEnum:
      enum:
      - MALE
      - FEMALE
      - BOTH
      type: string
      description: |-
        * `MALE` - Male
        * `FEMALE` - Female
        * `BOTH` - Both
    Gender608Enum:
      enum:
      - M
      - F
      - O
      type: string
      description: |-
        * `M` - Male
        * `F` - Female
        * `O` - Other
    GenotypeEnum:
      enum:
      - AA
      - AS
      - SS
      - AC
      - SC
      type: string
      description: |-
        * `AA` - AA
        * `AS` - AS
        * `SS` - SS
        * `AC` - AC
        * `SC` - SC
    NullEnum:
      enum:
      - null
    OrgContactCreate:
      type: object
      description: |-
        Serializer for public org contact form submission.
        Organization is set from the URL slug, not user input.
      properties:
        name:
          type: string
          maxLength: 200
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        message:
          type: string
      required:
      - email
      - message
      - name
      - phone
    OrgContactCreateRequest:
      type: object
      description: |-
        Serializer for public org contact form submission.
        Organization is set from the URL slug, not user input.
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200
        email:
          type: string
          format: email
          minLength: 1
          maxLength: 254
        phone:
          type: string
          minLength: 1
          maxLength: 20
        message:
          type: string
          minLength: 1
      required:
      - email
      - message
      - name
      - phone
    OrgContactList:
      type: object
      description: Serializer for listing org contact submissions on dashboards.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        organization:
          type: string
          format: uuid
        organization_name:
          type: string
          readOnly: true
        name:
          type: string
          maxLength: 200
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        message:
          type: string
        is_responded:
          type: boolean
        responded_at:
          type: string
          format: date-time
          nullable: true
        response_message:
          type: string
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - created_at
      - email
      - id
      - message
      - name
      - organization
      - organization_name
      - phone
    OrgTypeEnum:
      enum:
      - HOSPITAL
      - CLINIC
      - SCHOOL_CLINIC
      type: string
      description: |-
        * `HOSPITAL` - Hospital
        * `CLINIC` - Clinic
        * `SCHOOL_CLINIC` - School Clinic
    OrganizationDetail:
      type: object
      description: |-
        Complete organization details (Superadmin, Org Admin).
        Expects queryset annotated with total_staff, total_patients, total_episodes counts.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        org_id:
          type: string
          readOnly: true
          description: 'Unique org ID in format: HCL-{COUNTRY}-{SLUG}-{RANDOM}'
        name:
          type: string
          description: Official organization name
          maxLength: 200
        slug:
          type: string
          readOnly: true
          pattern: ^[-a-zA-Z0-9_]+$
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        email:
          type: string
          format: email
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        address:
          type: string
          description: Full street address
        city:
          type: string
          description: City name
          maxLength: 100
        state:
          type: string
          description: State/Province/Region
          maxLength: 100
        country_code:
          type: string
          description: ISO 3166-1 alpha-2 country code (e.g., NG, US, GB)
          maxLength: 5
        country_name:
          type: string
          maxLength: 100
        license_number:
          type: string
          description: Government-issued healthcare license number
          maxLength: 100
        is_active:
          type: boolean
          description: Can this org create patients, send referrals, etc.?
        is_verified:
          type: boolean
          description: Has this org been verified by HealthClouda admin?
        verified_at:
          type: string
          format: date-time
          readOnly: true
          nullable: true
        total_staff:
          type: integer
          readOnly: true
          default: 0
        total_patients:
          type: integer
          readOnly: true
          default: 0
        total_episodes:
          type: integer
          readOnly: true
          default: 0
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - address
      - city
      - country_code
      - country_name
      - created_at
      - email
      - id
      - name
      - org_id
      - slug
      - state
      - total_episodes
      - total_patients
      - total_staff
      - updated_at
      - verified_at
    OrganizationDetailRequest:
      type: object
      description: |-
        Complete organization details (Superadmin, Org Admin).
        Expects queryset annotated with total_staff, total_patients, total_episodes counts.
      properties:
        name:
          type: string
          minLength: 1
          description: Official organization name
          maxLength: 200
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        email:
          type: string
          format: email
          minLength: 1
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        address:
          type: string
          minLength: 1
          description: Full street address
        city:
          type: string
          minLength: 1
          description: City name
          maxLength: 100
        state:
          type: string
          minLength: 1
          description: State/Province/Region
          maxLength: 100
        country_code:
          type: string
          minLength: 1
          description: ISO 3166-1 alpha-2 country code (e.g., NG, US, GB)
          maxLength: 5
        country_name:
          type: string
          minLength: 1
          maxLength: 100
        license_number:
          type: string
          description: Government-issued healthcare license number
          maxLength: 100
        is_active:
          type: boolean
          description: Can this org create patients, send referrals, etc.?
        is_verified:
          type: boolean
          description: Has this org been verified by HealthClouda admin?
      required:
      - address
      - city
      - country_code
      - country_name
      - email
      - name
      - state
    OrganizationList:
      type: object
      description: |-
        Serializer for organization list view (Superadmin).
        Expects queryset annotated with total_staff and total_patients counts.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        org_id:
          type: string
          readOnly: true
          description: 'Unique org ID in format: HCL-{COUNTRY}-{SLUG}-{RANDOM}'
        name:
          type: string
          description: Official organization name
          maxLength: 200
        slug:
          type: string
          maxLength: 200
          pattern: ^[-a-zA-Z0-9_]+$
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        email:
          type: string
          format: email
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        city:
          type: string
          description: City name
          maxLength: 100
        state:
          type: string
          description: State/Province/Region
          maxLength: 100
        country_name:
          type: string
          maxLength: 100
        is_active:
          type: boolean
          description: Can this org create patients, send referrals, etc.?
        is_verified:
          type: boolean
          description: Has this org been verified by HealthClouda admin?
        total_staff:
          type: integer
          readOnly: true
          default: 0
        total_patients:
          type: integer
          readOnly: true
          default: 0
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - city
      - country_name
      - created_at
      - email
      - id
      - name
      - org_id
      - slug
      - state
      - total_patients
      - total_staff
    OrganizationMinimal:
      type: object
      description: Minimal organization info for user list/detail views
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          readOnly: true
        org_id:
          type: string
          readOnly: true
      required:
      - id
      - name
      - org_id
    PaginatedAdmissionListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/AdmissionList'
    PaginatedAuditLogList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/AuditLog'
    PaginatedBedListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/BedList'
    PaginatedContactUsList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/ContactUs'
    PaginatedDataAccessLogList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/DataAccessLog'
    PaginatedEpisodeListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/EpisodeList'
    PaginatedOrgContactListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/OrgContactList'
    PaginatedOrganizationListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/OrganizationList'
    PaginatedPatientAuditTrailList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/PatientAuditTrail'
    PaginatedPatientListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/PatientList'
    PaginatedReferralListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/ReferralList'
    PaginatedRoomListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/RoomList'
    PaginatedUserListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/UserList'
    PaginatedWardListList:
      type: object
      required:
      - count
      - results
      properties:
        count:
          type: integer
          example: 123
        next:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=4
        previous:
          type: string
          nullable: true
          format: uri
          example: http://api.example.org/accounts/?page=2
        results:
          type: array
          items:
            $ref: '#/components/schemas/WardList'
    PasswordResetRequest:
      type: object
      description: Serializer for admin password reset
      properties:
        new_password:
          type: string
          writeOnly: true
          minLength: 8
      required:
      - new_password
    PatchedBedCreateUpdateRequest:
      type: object
      properties:
        bed_number:
          type: string
          minLength: 1
          maxLength: 20
        status:
          $ref: '#/components/schemas/StatusAc8Enum'
        ward:
          type: string
          format: uuid
          nullable: true
        room:
          type: string
          format: uuid
          nullable: true
    PatchedEpisodeUpdateRequest:
      type: object
      description: |-
        Serializer for updating episodes.
        Cannot change patient, organization, or episode_start.
      properties:
        episode_type:
          $ref: '#/components/schemas/EpisodeTypeEnum'
        chief_complaint:
          type: string
          description: Reason for visit (patient can see)
        diagnosis:
          type: string
          description: Medical diagnosis (patient can see)
        prescribed_drugs:
          type: string
          description: Medications prescribed (patient can see)
        patient_instructions:
          type: string
          description: Instructions for patient in simple language (patient can see)
        vitals:
          nullable: true
          description: 'Vital signs: BP, temp, pulse, weight, etc. (patient can see)'
        clinical_notes:
          type: string
          description: Internal clinical observations (DOCTOR/NURSE ONLY)
        treatment_plan:
          type: string
          description: Detailed treatment plan (DOCTOR/NURSE ONLY)
    PatchedOrganizationDetailRequest:
      type: object
      description: |-
        Complete organization details (Superadmin, Org Admin).
        Expects queryset annotated with total_staff, total_patients, total_episodes counts.
      properties:
        name:
          type: string
          minLength: 1
          description: Official organization name
          maxLength: 200
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        email:
          type: string
          format: email
          minLength: 1
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        address:
          type: string
          minLength: 1
          description: Full street address
        city:
          type: string
          minLength: 1
          description: City name
          maxLength: 100
        state:
          type: string
          minLength: 1
          description: State/Province/Region
          maxLength: 100
        country_code:
          type: string
          minLength: 1
          description: ISO 3166-1 alpha-2 country code (e.g., NG, US, GB)
          maxLength: 5
        country_name:
          type: string
          minLength: 1
          maxLength: 100
        license_number:
          type: string
          description: Government-issued healthcare license number
          maxLength: 100
        is_active:
          type: boolean
          description: Can this org create patients, send referrals, etc.?
        is_verified:
          type: boolean
          description: Has this org been verified by HealthClouda admin?
    PatchedRoomCreateUpdateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        room_number:
          type: string
          minLength: 1
          maxLength: 20
        is_private:
          type: boolean
        has_bathroom:
          type: boolean
        has_ac:
          type: boolean
        max_occupancy:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Maximum number of beds this room can accommodate
    PatchedUserUpdateRequest:
      type: object
      description: Serializer for updating staff users
      properties:
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        phone:
          type: string
          maxLength: 20
        role:
          $ref: '#/components/schemas/RoleEnum'
        is_active:
          type: boolean
          title: Active
          description: Designates whether this user should be treated as active. Unselect
            this instead of deleting accounts.
    PatchedWardCreateUpdateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
        category_other:
          type: string
          description: Specify ward type if 'Other' is selected
          maxLength: 100
        gender:
          $ref: '#/components/schemas/Gender10eEnum'
        total_beds:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Total bed capacity in this ward
    PatientAuditTrail:
      type: object
      description: |-
        Simplified audit trail for patients to view their own data.
        Hides technical details.
      properties:
        date:
          type: string
          format: date-time
        action:
          type: string
        who:
          type: string
        what:
          type: string
      required:
      - action
      - date
      - what
      - who
    PatientCreate:
      type: object
      description: |-
        Serializer for creating new patients.
        Validates consent checkbox and required fields.
        All new fields are optional so existing flows still work.
      properties:
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        date_of_birth:
          type: string
          format: date
          nullable: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        address:
          type: string
          nullable: true
          description: Street address
        city:
          type: string
          nullable: true
          maxLength: 100
        state:
          type: string
          nullable: true
          maxLength: 100
        country:
          type: string
          nullable: true
          maxLength: 100
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
        genotype:
          nullable: true
          description: |-
            Hemoglobin genotype

            * `AA` - AA
            * `AS` - AS
            * `SS` - SS
            * `AC` - AC
            * `SC` - SC
          oneOf:
          - $ref: '#/components/schemas/GenotypeEnum'
          - $ref: '#/components/schemas/BlankEnum'
          - $ref: '#/components/schemas/NullEnum'
        allergies:
          type: string
          nullable: true
          description: Known allergies (medications, food, etc.)
        chronic_diseases:
          type: string
          description: Comma-separated list of chronic diseases (e.g., Diabetes, Hypertension,
            Asthma)
        current_medications:
          type: string
          nullable: true
          description: Currently prescribed medications
        emergency_contact_name:
          type: string
          nullable: true
          maxLength: 200
        emergency_contact_phone:
          type: string
          nullable: true
          maxLength: 20
        emergency_contact_relationship:
          type: string
          nullable: true
          description: Relationship to patient (e.g., Spouse, Parent, Sibling)
          maxLength: 100
        consent_given:
          type: boolean
      required:
      - email
      - first_name
      - last_name
    PatientCreateRequest:
      type: object
      description: |-
        Serializer for creating new patients.
        Validates consent checkbox and required fields.
        All new fields are optional so existing flows still work.
      properties:
        first_name:
          type: string
          minLength: 1
          maxLength: 100
        last_name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
          minLength: 1
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        date_of_birth:
          type: string
          format: date
          nullable: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        address:
          type: string
          nullable: true
          description: Street address
        city:
          type: string
          nullable: true
          maxLength: 100
        state:
          type: string
          nullable: true
          maxLength: 100
        country:
          type: string
          nullable: true
          maxLength: 100
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
        genotype:
          nullable: true
          description: |-
            Hemoglobin genotype

            * `AA` - AA
            * `AS` - AS
            * `SS` - SS
            * `AC` - AC
            * `SC` - SC
          oneOf:
          - $ref: '#/components/schemas/GenotypeEnum'
          - $ref: '#/components/schemas/BlankEnum'
          - $ref: '#/components/schemas/NullEnum'
        allergies:
          type: string
          nullable: true
          description: Known allergies (medications, food, etc.)
        chronic_diseases:
          type: string
          description: Comma-separated list of chronic diseases (e.g., Diabetes, Hypertension,
            Asthma)
        current_medications:
          type: string
          nullable: true
          description: Currently prescribed medications
        emergency_contact_name:
          type: string
          nullable: true
          maxLength: 200
        emergency_contact_phone:
          type: string
          nullable: true
          maxLength: 20
        emergency_contact_relationship:
          type: string
          nullable: true
          description: Relationship to patient (e.g., Spouse, Parent, Sibling)
          maxLength: 100
        consent_given:
          type: boolean
      required:
      - email
      - first_name
      - last_name
    PatientDetail:
      type: object
      description: |-
        Complete serializer for patient detail view.
        Includes all fields and related data.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        healthclouda_id:
          type: string
          readOnly: true
          description: Unique Healthclouda ID (HCL-XXXXXX format)
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        date_of_birth:
          type: string
          format: date
          nullable: true
        age:
          type: string
          readOnly: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        address:
          type: string
          nullable: true
          description: Street address
        city:
          type: string
          nullable: true
          maxLength: 100
        state:
          type: string
          nullable: true
          maxLength: 100
        country:
          type: string
          nullable: true
          maxLength: 100
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
        genotype:
          nullable: true
          description: |-
            Hemoglobin genotype

            * `AA` - AA
            * `AS` - AS
            * `SS` - SS
            * `AC` - AC
            * `SC` - SC
          oneOf:
          - $ref: '#/components/schemas/GenotypeEnum'
          - $ref: '#/components/schemas/BlankEnum'
          - $ref: '#/components/schemas/NullEnum'
        allergies:
          type: string
          nullable: true
          description: Known allergies (medications, food, etc.)
        chronic_diseases:
          type: string
          description: Comma-separated list of chronic diseases (e.g., Diabetes, Hypertension,
            Asthma)
        current_medications:
          type: string
          nullable: true
          description: Currently prescribed medications
        emergency_contact_name:
          type: string
          nullable: true
          maxLength: 200
        emergency_contact_phone:
          type: string
          nullable: true
          maxLength: 20
        emergency_contact_relationship:
          type: string
          nullable: true
          description: Relationship to patient (e.g., Spouse, Parent, Sibling)
          maxLength: 100
        is_active:
          type: boolean
          description: Active patient account
        consent_given:
          type: boolean
        consent_given_at:
          type: string
          format: date-time
          readOnly: true
          nullable: true
        total_episodes:
          type: string
          readOnly: true
        has_active_episode:
          type: string
          readOnly: true
        consent_status:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - age
      - consent_given_at
      - consent_status
      - created_at
      - email
      - first_name
      - has_active_episode
      - healthclouda_id
      - id
      - last_name
      - total_episodes
      - updated_at
    PatientList:
      type: object
      description: |-
        Lightweight serializer for patient list view.
        Only essential fields for performance.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        healthclouda_id:
          type: string
          readOnly: true
          description: Unique Healthclouda ID (HCL-XXXXXX format)
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        date_of_birth:
          type: string
          format: date
          nullable: true
        age:
          type: string
          readOnly: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
        city:
          type: string
          nullable: true
          maxLength: 100
        state:
          type: string
          nullable: true
          maxLength: 100
        is_active:
          type: boolean
          description: Active patient account
      required:
      - age
      - email
      - first_name
      - healthclouda_id
      - id
      - last_name
    PatientNested:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        healthclouda_id:
          type: string
          description: Unique Healthclouda ID (HCL-XXXXXX format)
          maxLength: 20
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
      required:
      - first_name
      - healthclouda_id
      - id
      - last_name
    ReferralCreate:
      type: object
      description: Create referral - doctor manually writes content.
      properties:
        patient:
          type: string
          format: uuid
          description: Patient being referred
        to_organization:
          type: string
          format: uuid
          description: Receiving organization (e.g., Hospital)
        referring_episode_id:
          type: string
          format: uuid
          nullable: true
          description: Episode that triggered this referral (internal tracking only,
            NOT shared)
        reason:
          type: string
          description: Reason for referral - what specialist care is needed
        relevant_history:
          type: string
          description: RELEVANT medical history only (doctor's discretion)
        clinical_findings:
          type: string
          description: Examination findings, vital signs, test results
        provisional_diagnosis:
          type: string
          description: Working diagnosis
        recommended_investigations:
          type: string
          description: Suggested tests or procedures
        recommended_treatment:
          type: string
          description: Suggested treatment plan or management
        urgency:
          $ref: '#/components/schemas/UrgencyEnum'
      required:
      - clinical_findings
      - patient
      - provisional_diagnosis
      - reason
      - to_organization
    ReferralCreateRequest:
      type: object
      description: Create referral - doctor manually writes content.
      properties:
        patient:
          type: string
          format: uuid
          description: Patient being referred
        to_organization:
          type: string
          format: uuid
          description: Receiving organization (e.g., Hospital)
        referring_episode_id:
          type: string
          format: uuid
          nullable: true
          description: Episode that triggered this referral (internal tracking only,
            NOT shared)
        reason:
          type: string
          minLength: 1
          description: Reason for referral - what specialist care is needed
        relevant_history:
          type: string
          description: RELEVANT medical history only (doctor's discretion)
        clinical_findings:
          type: string
          minLength: 1
          description: Examination findings, vital signs, test results
        provisional_diagnosis:
          type: string
          minLength: 1
          description: Working diagnosis
        recommended_investigations:
          type: string
          description: Suggested tests or procedures
        recommended_treatment:
          type: string
          description: Suggested treatment plan or management
        urgency:
          $ref: '#/components/schemas/UrgencyEnum'
      required:
      - clinical_findings
      - patient
      - provisional_diagnosis
      - reason
      - to_organization
    ReferralDetail:
      type: object
      description: Detail view - complete referral information.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        letter_number:
          type: string
          description: Unique referral number (e.g., REF-LUT-2026-0001)
          maxLength: 50
        patient:
          allOf:
          - $ref: '#/components/schemas/ReferralPatient'
          readOnly: true
        patient_healthclouda_id:
          type: string
          description: Patient's HealthClouda ID (for letter identification)
          maxLength: 50
        patient_age_at_referral:
          type: integer
          maximum: 2147483647
          minimum: -2147483648
          description: Patient age at time of referral (snapshot)
        from_organization:
          allOf:
          - $ref: '#/components/schemas/ReferralOrganization'
          readOnly: true
        to_organization:
          allOf:
          - $ref: '#/components/schemas/ReferralOrganization'
          readOnly: true
        referring_doctor:
          allOf:
          - $ref: '#/components/schemas/ReferralDoctor'
          readOnly: true
        reason:
          type: string
          description: Reason for referral - what specialist care is needed
        relevant_history:
          type: string
          description: RELEVANT medical history only (doctor's discretion)
        clinical_findings:
          type: string
          description: Examination findings, vital signs, test results
        provisional_diagnosis:
          type: string
          description: Working diagnosis
        recommended_investigations:
          type: string
          description: Suggested tests or procedures
        recommended_treatment:
          type: string
          description: Suggested treatment plan or management
        urgency:
          $ref: '#/components/schemas/UrgencyEnum'
        urgency_display:
          type: string
          readOnly: true
        status:
          $ref: '#/components/schemas/StatusDfaEnum'
        status_display:
          type: string
          readOnly: true
        response_notes:
          type: string
          description: Notes from receiving hospital (acceptance/decline reason)
        responded_by:
          allOf:
          - $ref: '#/components/schemas/ReferralDoctor'
          readOnly: true
        responded_at:
          type: string
          format: date-time
          nullable: true
          description: When referral was accepted/declined
        created_episode:
          type: string
          format: uuid
          nullable: true
          description: Episode created at receiving hospital (if accepted)
        patient_consent_obtained:
          type: boolean
          description: Patient consented to share information with receiving hospital
        consent_obtained_at:
          type: string
          format: date-time
          nullable: true
          description: When consent was obtained
        has_letter:
          type: string
          readOnly: true
        letter_generated_at:
          type: string
          format: date-time
          nullable: true
          description: When PDF was generated
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - clinical_findings
      - created_at
      - from_organization
      - has_letter
      - id
      - letter_number
      - patient
      - patient_age_at_referral
      - patient_healthclouda_id
      - provisional_diagnosis
      - reason
      - referring_doctor
      - responded_by
      - status_display
      - to_organization
      - updated_at
      - urgency_display
    ReferralDetailRequest:
      type: object
      description: Detail view - complete referral information.
      properties:
        letter_number:
          type: string
          minLength: 1
          description: Unique referral number (e.g., REF-LUT-2026-0001)
          maxLength: 50
        patient_healthclouda_id:
          type: string
          minLength: 1
          description: Patient's HealthClouda ID (for letter identification)
          maxLength: 50
        patient_age_at_referral:
          type: integer
          maximum: 2147483647
          minimum: -2147483648
          description: Patient age at time of referral (snapshot)
        reason:
          type: string
          minLength: 1
          description: Reason for referral - what specialist care is needed
        relevant_history:
          type: string
          description: RELEVANT medical history only (doctor's discretion)
        clinical_findings:
          type: string
          minLength: 1
          description: Examination findings, vital signs, test results
        provisional_diagnosis:
          type: string
          minLength: 1
          description: Working diagnosis
        recommended_investigations:
          type: string
          description: Suggested tests or procedures
        recommended_treatment:
          type: string
          description: Suggested treatment plan or management
        urgency:
          $ref: '#/components/schemas/UrgencyEnum'
        status:
          $ref: '#/components/schemas/StatusDfaEnum'
        response_notes:
          type: string
          description: Notes from receiving hospital (acceptance/decline reason)
        responded_at:
          type: string
          format: date-time
          nullable: true
          description: When referral was accepted/declined
        created_episode:
          type: string
          format: uuid
          nullable: true
          description: Episode created at receiving hospital (if accepted)
        patient_consent_obtained:
          type: boolean
          description: Patient consented to share information with receiving hospital
        consent_obtained_at:
          type: string
          format: date-time
          nullable: true
          description: When consent was obtained
        letter_generated_at:
          type: string
          format: date-time
          nullable: true
          description: When PDF was generated
      required:
      - clinical_findings
      - letter_number
      - patient_age_at_referral
      - patient_healthclouda_id
      - provisional_diagnosis
      - reason
    ReferralDoctor:
      type: object
      description: Doctor info for referral.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        full_name:
          type: string
          readOnly: true
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        role:
          $ref: '#/components/schemas/RoleEnum'
      required:
      - email
      - full_name
      - id
      - role
    ReferralDoctorRequest:
      type: object
      description: Doctor info for referral.
      properties:
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        email:
          type: string
          format: email
          minLength: 1
          maxLength: 254
        phone:
          type: string
          maxLength: 20
        role:
          $ref: '#/components/schemas/RoleEnum'
      required:
      - email
      - role
    ReferralList:
      type: object
      description: List view - summary of referrals.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        letter_number:
          type: string
          description: Unique referral number (e.g., REF-LUT-2026-0001)
          maxLength: 50
        patient:
          allOf:
          - $ref: '#/components/schemas/ReferralPatient'
          readOnly: true
        from_organization:
          allOf:
          - $ref: '#/components/schemas/ReferralOrganization'
          readOnly: true
        to_organization:
          allOf:
          - $ref: '#/components/schemas/ReferralOrganization'
          readOnly: true
        referring_doctor:
          allOf:
          - $ref: '#/components/schemas/ReferralDoctor'
          readOnly: true
        reason:
          type: string
          description: Reason for referral - what specialist care is needed
        urgency:
          $ref: '#/components/schemas/UrgencyEnum'
        urgency_display:
          type: string
          readOnly: true
        status:
          $ref: '#/components/schemas/StatusDfaEnum'
        status_display:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - created_at
      - from_organization
      - id
      - letter_number
      - patient
      - reason
      - referring_doctor
      - status_display
      - to_organization
      - urgency_display
    ReferralOrganization:
      type: object
      description: Organization info for referral.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          description: Official organization name
          maxLength: 200
        org_id:
          type: string
          readOnly: true
          description: 'Unique org ID in format: HCL-{COUNTRY}-{SLUG}-{RANDOM}'
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        phone:
          type: string
          maxLength: 20
        email:
          type: string
          format: email
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        address:
          type: string
          description: Full street address
        city:
          type: string
          description: City name
          maxLength: 100
        state:
          type: string
          description: State/Province/Region
          maxLength: 100
      required:
      - address
      - city
      - email
      - id
      - name
      - org_id
      - state
    ReferralOrganizationRequest:
      type: object
      description: Organization info for referral.
      properties:
        name:
          type: string
          minLength: 1
          description: Official organization name
          maxLength: 200
        org_type:
          $ref: '#/components/schemas/OrgTypeEnum'
        phone:
          type: string
          maxLength: 20
        email:
          type: string
          format: email
          minLength: 1
          description: Official email for inter-org communication (referrals, etc.)
          maxLength: 254
        address:
          type: string
          minLength: 1
          description: Full street address
        city:
          type: string
          minLength: 1
          description: City name
          maxLength: 100
        state:
          type: string
          minLength: 1
          description: State/Province/Region
          maxLength: 100
      required:
      - address
      - city
      - email
      - name
      - state
    ReferralPatient:
      type: object
      description: Lightweight patient info for referral.
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        healthclouda_id:
          type: string
          description: Unique Healthclouda ID (HCL-XXXXXX format)
          maxLength: 20
        first_name:
          type: string
          maxLength: 100
        last_name:
          type: string
          maxLength: 100
        date_of_birth:
          type: string
          format: date
          nullable: true
        age:
          type: string
          readOnly: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
      required:
      - age
      - first_name
      - healthclouda_id
      - id
      - last_name
    ReferralPatientRequest:
      type: object
      description: Lightweight patient info for referral.
      properties:
        healthclouda_id:
          type: string
          minLength: 1
          description: Unique Healthclouda ID (HCL-XXXXXX format)
          maxLength: 20
        first_name:
          type: string
          minLength: 1
          maxLength: 100
        last_name:
          type: string
          minLength: 1
          maxLength: 100
        date_of_birth:
          type: string
          format: date
          nullable: true
        gender:
          oneOf:
          - $ref: '#/components/schemas/Gender608Enum'
          - $ref: '#/components/schemas/BlankEnum'
        blood_type:
          type: string
          description: Blood type (e.g., O+, A-, AB+)
          maxLength: 5
      required:
      - first_name
      - healthclouda_id
      - last_name
    ReferralResponse:
      type: object
      description: Accept or decline referral.
      properties:
        response_notes:
          type: string
          description: Reason for acceptance or decline
          maxLength: 2000
        create_episode:
          type: boolean
          default: true
          description: Create episode at receiving organization (for acceptance)
        chief_complaint:
          type: string
          default: ''
          description: Chief complaint for new episode
          maxLength: 500
        diagnosis:
          type: string
          default: ''
          description: Initial diagnosis for new episode
          maxLength: 1000
      required:
      - response_notes
    ReferralResponseRequest:
      type: object
      description: Accept or decline referral.
      properties:
        response_notes:
          type: string
          minLength: 1
          description: Reason for acceptance or decline
          maxLength: 2000
        create_episode:
          type: boolean
          default: true
          description: Create episode at receiving organization (for acceptance)
        chief_complaint:
          type: string
          default: ''
          description: Chief complaint for new episode
          maxLength: 500
        diagnosis:
          type: string
          default: ''
          description: Initial diagnosis for new episode
          maxLength: 1000
      required:
      - response_notes
    RoleEnum:
      enum:
      - SUPERADMIN
      - ORGANIZATION_ADMIN
      - DOCTOR
      - NURSE
      - RECEPTIONIST
      - PATIENT
      type: string
      description: |-
        * `SUPERADMIN` - Super Admin
        * `ORGANIZATION_ADMIN` - Organization Admin
        * `DOCTOR` - Doctor
        * `NURSE` - Nurse
        * `RECEPTIONIST` - Receptionist
        * `PATIENT` - Patient
    RoomCreateUpdate:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        room_number:
          type: string
          maxLength: 20
        is_private:
          type: boolean
        has_bathroom:
          type: boolean
        has_ac:
          type: boolean
        max_occupancy:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Maximum number of beds this room can accommodate
      required:
      - name
      - room_number
    RoomCreateUpdateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        room_number:
          type: string
          minLength: 1
          maxLength: 20
        is_private:
          type: boolean
        has_bathroom:
          type: boolean
        has_ac:
          type: boolean
        max_occupancy:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Maximum number of beds this room can accommodate
      required:
      - name
      - room_number
    RoomDetail:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        room_number:
          type: string
          maxLength: 20
        is_private:
          type: boolean
        has_bathroom:
          type: boolean
        has_ac:
          type: boolean
        max_occupancy:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Maximum number of beds this room can accommodate
        available_beds:
          type: string
          readOnly: true
        current_bed_count:
          type: string
          readOnly: true
        is_at_capacity:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
        beds:
          type: array
          items:
            $ref: '#/components/schemas/BedNested'
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - available_beds
      - beds
      - created_at
      - current_bed_count
      - id
      - is_at_capacity
      - name
      - room_number
      - updated_at
    RoomList:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        room_number:
          type: string
          maxLength: 20
        is_private:
          type: boolean
        has_bathroom:
          type: boolean
        has_ac:
          type: boolean
        max_occupancy:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Maximum number of beds this room can accommodate
        available_beds:
          type: string
          readOnly: true
        current_bed_count:
          type: string
          readOnly: true
        is_at_capacity:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - available_beds
      - created_at
      - current_bed_count
      - id
      - is_at_capacity
      - name
      - room_number
    RoomNested:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        room_number:
          type: string
          maxLength: 20
      required:
      - id
      - name
      - room_number
    Status897Enum:
      enum:
      - ACTIVE
      - DISCHARGED
      - TRANSFERRED
      type: string
      description: |-
        * `ACTIVE` - Currently Admitted
        * `DISCHARGED` - Discharged
        * `TRANSFERRED` - Transferred to Another Bed
    StatusAc8Enum:
      enum:
      - AVAILABLE
      - OCCUPIED
      - MAINTENANCE
      - RESERVED
      type: string
      description: |-
        * `AVAILABLE` - Available
        * `OCCUPIED` - Occupied
        * `MAINTENANCE` - Under Maintenance
        * `RESERVED` - Reserved
    StatusDfaEnum:
      enum:
      - PENDING
      - ACCEPTED
      - DECLINED
      - COMPLETED
      - CANCELLED
      type: string
      description: |-
        * `PENDING` - Pending Response
        * `ACCEPTED` - Accepted by Receiving Hospital
        * `DECLINED` - Declined by Receiving Hospital
        * `COMPLETED` - Treatment Completed
        * `CANCELLED` - Cancelled by Sending Hospital
    TokenRefresh:
      type: object
      properties:
        access:
          type: string
          readOnly: true
        refresh:
          type: string
      required:
      - access
      - refresh
    TokenRefreshRequest:
      type: object
      properties:
        refresh:
          type: string
          minLength: 1
      required:
      - refresh
    Transfer:
      type: object
      properties:
        new_bed:
          type: string
          format: uuid
      required:
      - new_bed
    TransferRequest:
      type: object
      properties:
        new_bed:
          type: string
          format: uuid
      required:
      - new_bed
    UrgencyEnum:
      enum:
      - ROUTINE
      - LOW
      - MEDIUM
      - HIGH
      - URGENT
      - CRITICAL
      - EMERGENCY
      type: string
      description: |-
        * `ROUTINE` - Routine
        * `LOW` - Low
        * `MEDIUM` - Medium
        * `HIGH` - High
        * `URGENT` - Urgent - within 48 hours
        * `CRITICAL` - Critical - immediate attention
        * `EMERGENCY` - Emergency - immediate attention
    UserCreate:
      type: object
      description: Serializer for creating staff users
      properties:
        email:
          type: string
          format: email
          maxLength: 254
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        role:
          $ref: '#/components/schemas/RoleEnum'
        phone:
          type: string
          maxLength: 20
        organization:
          type: string
          format: uuid
      required:
      - email
      - role
    UserCreateRequest:
      type: object
      description: Serializer for creating staff users
      properties:
        email:
          type: string
          format: email
          minLength: 1
          maxLength: 254
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        role:
          $ref: '#/components/schemas/RoleEnum'
        phone:
          type: string
          maxLength: 20
        password:
          type: string
          writeOnly: true
          minLength: 8
        organization:
          type: string
          format: uuid
      required:
      - email
      - password
      - role
    UserDetail:
      type: object
      description: Serializer for user detail view
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        email:
          type: string
          format: email
          readOnly: true
        first_name:
          type: string
          readOnly: true
        last_name:
          type: string
          readOnly: true
        role:
          allOf:
          - $ref: '#/components/schemas/RoleEnum'
          readOnly: true
        phone:
          type: string
          readOnly: true
        is_active:
          type: boolean
          readOnly: true
          title: Active
          description: Designates whether this user should be treated as active. Unselect
            this instead of deleting accounts.
        last_login:
          type: string
          format: date-time
          readOnly: true
          nullable: true
        date_joined:
          type: string
          format: date-time
          readOnly: true
        force_password_change:
          type: boolean
          readOnly: true
        password_changed_at:
          type: string
          format: date-time
          readOnly: true
          nullable: true
        organization:
          allOf:
          - $ref: '#/components/schemas/OrganizationMinimal'
          readOnly: true
      required:
      - date_joined
      - email
      - first_name
      - force_password_change
      - id
      - is_active
      - last_login
      - last_name
      - organization
      - password_changed_at
      - phone
      - role
    UserList:
      type: object
      description: Serializer for user list view
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        email:
          type: string
          format: email
          readOnly: true
        first_name:
          type: string
          readOnly: true
        last_name:
          type: string
          readOnly: true
        role:
          allOf:
          - $ref: '#/components/schemas/RoleEnum'
          readOnly: true
        phone:
          type: string
          readOnly: true
        is_active:
          type: boolean
          readOnly: true
          title: Active
          description: Designates whether this user should be treated as active. Unselect
            this instead of deleting accounts.
        last_login:
          type: string
          format: date-time
          readOnly: true
          nullable: true
        date_joined:
          type: string
          format: date-time
          readOnly: true
        organization:
          allOf:
          - $ref: '#/components/schemas/OrganizationMinimal'
          readOnly: true
      required:
      - date_joined
      - email
      - first_name
      - id
      - is_active
      - last_login
      - last_name
      - organization
      - phone
      - role
    UserNested:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        email:
          type: string
          format: email
          maxLength: 254
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        role:
          $ref: '#/components/schemas/RoleEnum'
      required:
      - email
      - id
      - role
    UserUpdate:
      type: object
      description: Serializer for updating staff users
      properties:
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        phone:
          type: string
          maxLength: 20
        role:
          $ref: '#/components/schemas/RoleEnum'
        is_active:
          type: boolean
          title: Active
          description: Designates whether this user should be treated as active. Unselect
            this instead of deleting accounts.
      required:
      - role
    UserUpdateRequest:
      type: object
      description: Serializer for updating staff users
      properties:
        first_name:
          type: string
          maxLength: 150
        last_name:
          type: string
          maxLength: 150
        phone:
          type: string
          maxLength: 20
        role:
          $ref: '#/components/schemas/RoleEnum'
        is_active:
          type: boolean
          title: Active
          description: Designates whether this user should be treated as active. Unselect
            this instead of deleting accounts.
      required:
      - role
    WardCreateUpdate:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
        category_other:
          type: string
          description: Specify ward type if 'Other' is selected
          maxLength: 100
        gender:
          $ref: '#/components/schemas/Gender10eEnum'
        total_beds:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Total bed capacity in this ward
      required:
      - name
    WardCreateUpdateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
        category_other:
          type: string
          description: Specify ward type if 'Other' is selected
          maxLength: 100
        gender:
          $ref: '#/components/schemas/Gender10eEnum'
        total_beds:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Total bed capacity in this ward
      required:
      - name
    WardDetail:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
        category_other:
          type: string
          description: Specify ward type if 'Other' is selected
          maxLength: 100
        gender:
          $ref: '#/components/schemas/Gender10eEnum'
        total_beds:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Total bed capacity in this ward
        available_beds:
          type: string
          readOnly: true
        occupied_beds:
          type: string
          readOnly: true
        occupancy_rate:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
        beds:
          type: array
          items:
            $ref: '#/components/schemas/BedNested'
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - available_beds
      - beds
      - created_at
      - id
      - name
      - occupancy_rate
      - occupied_beds
      - updated_at
    WardList:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
        category_other:
          type: string
          description: Specify ward type if 'Other' is selected
          maxLength: 100
        gender:
          $ref: '#/components/schemas/Gender10eEnum'
        total_beds:
          type: integer
          maximum: 2147483647
          minimum: 0
          description: Total bed capacity in this ward
        available_beds:
          type: string
          readOnly: true
        occupied_beds:
          type: string
          readOnly: true
        occupancy_rate:
          type: string
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
      required:
      - available_beds
      - created_at
      - id
      - name
      - occupancy_rate
      - occupied_beds
    WardNested:
      type: object
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        name:
          type: string
          maxLength: 100
        category:
          $ref: '#/components/schemas/CategoryEnum'
      required:
      - id
      - name
  securitySchemes:
    jwtAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
tags:
- name: Auth
  description: Authentication, login, OTP, password management
- name: Patients
  description: Patient records, episodes, vitals, consents
- name: Organizations
  description: Organization management and landing pages
- name: Referrals
  description: Inter-org referral letters and workflows
- name: Ward
  description: Ward, room, bed, and admission management
- name: Audit
  description: Audit logs and data access trails
- name: Superadmin
  description: Platform-level administration
