<template>
  <div class="page">
    <h1 class="page-title">User Management</h1>

    <p v-if="pageError" class="page-message error">{{ pageError }}</p>

    <div class="grid">
      <div class="card profile-card">
        <div class="profile-circle">
          <span class="profile-icon">{{ profileInitials }}</span>
        </div>
        <div class="profile-text">
          <h2>Hi, {{ summary.currentUser?.fullName ?? 'Admin' }}!</h2>
          <p class="role">{{ summary.currentUser?.role ?? 'staff' }}</p>
          <p class="started">Started on {{ formatDate(summary.currentUser?.createdAt) }}</p>
          <p class="user-id">User ID: {{ summary.currentUser?.userId ?? '-' }}</p>
        </div>
      </div>

      <div class="card stat-card">
        <p class="stat-label">Active Users</p>
        <p class="stat-value">{{ summary.activeUsers }}</p>
      </div>

      <div class="card stat-card">
        <p class="stat-label">Inactive Users</p>
        <p class="stat-value">{{ summary.inactiveUsers }}</p>
      </div>

      <div class="card security-card">
        <h3>Security Code</h3>
        <p class="security-note">
          The current code is stored hashed in Supabase, so it cannot be revealed. You can replace it here.
        </p>

        <div class="security-input-row">
          <input
            class="security-input"
            :type="showSecurityCode ? 'text' : 'password'"
            v-model="newSecurityCode"
            placeholder="Enter new security code"
          />
        </div>

        <div class="show-code">
          <input type="checkbox" id="show-security-code" v-model="showSecurityCode" />
          <label for="show-security-code">Show new security code</label>
        </div>

        <button class="security-btn" @click="updateSecurityCode" :disabled="securitySaving || !newSecurityCode.trim()">
          {{ securitySaving ? 'Updating...' : 'Update Security Code' }}
        </button>

        <p v-if="securityMessage" class="panel-message success">{{ securityMessage }}</p>
        <p v-if="securityError" class="panel-message error">{{ securityError }}</p>
        <p class="security-meta">
          Configured: {{ summary.registrationSecurityCodeConfigured ? 'Yes' : 'No' }}
        </p>
        <p class="security-meta">
          Last updated: {{ formatDate(summary.registrationSecurityCodeUpdatedAt, true) }}
        </p>
      </div>

      <div class="card users-card">
        <div class="users-header">
          <div>
            <h3>Users</h3>
            <p class="users-subtitle">Manage account roles, statuses, and inactivity reasons.</p>
          </div>

          <div class="users-actions">
            <input
              class="search-input"
              type="text"
              v-model="search"
              placeholder="Search by name or user ID"
            />
            <button class="edit-btn" :disabled="!selectedUser || usersLoading" @click="openEditModal">
              EDIT
            </button>
          </div>
        </div>

        <table class="users-table">
          <thead>
            <tr>
              <th></th>
              <th>Employee Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="usersLoading">
              <td colspan="5" class="table-state">Loading users...</td>
            </tr>

            <tr v-else-if="users.length === 0">
              <td colspan="5" class="table-state">No users found.</td>
            </tr>

            <tr
              v-for="user in users"
              :key="user.id"
              :class="{ selected: selectedUserId === user.id }"
              @click="selectUser(user)"
            >
              <td>
                <input type="radio" name="selected-user" :checked="selectedUserId === user.id" />
              </td>
              <td>
                <div class="name-cell">{{ user.fullName }}</div>
                <div class="sub-cell">{{ user.userId }}</div>
              </td>
              <td><span class="role-pill">{{ user.role }}</span></td>
              <td>
                <span :class="['status-pill', user.status]">{{ user.status }}</span>
              </td>
              <td>{{ user.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="table-footer">
          <span>Showing {{ users.length }} of {{ meta.total }} users</span>
          <div class="pagination" v-if="meta.totalPages > 1">
            <button class="page-btn" :disabled="meta.page === 1 || usersLoading" @click="changePage(meta.page - 1)">
              Prev
            </button>
            <span class="page-count">Page {{ meta.page }} / {{ meta.totalPages }}</span>
            <button class="page-btn" :disabled="meta.page === meta.totalPages || usersLoading" @click="changePage(meta.page + 1)">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal && editForm" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal">
        <button class="modal-close" @click="closeEditModal">x</button>
        <h3>Edit User</h3>
        <p class="modal-subtitle">{{ editForm.fullName }} ({{ editForm.userId }})</p>

        <label class="field-label">Role</label>
        <select v-model="editForm.role" class="field-input">
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>

        <label class="field-label">Status</label>
        <select v-model="editForm.status" class="field-input">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label class="field-label">Reason</label>
        <textarea
          v-model="editForm.reason"
          class="field-input textarea"
          placeholder="Reason for status change"
        ></textarea>

        <p v-if="editError" class="panel-message error">{{ editError }}</p>

        <div class="modal-actions">
          <button class="secondary-btn" @click="closeEditModal">Cancel</button>
          <button class="primary-btn" @click="saveUserChanges" :disabled="editSaving">
            {{ editSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { apiJsonRequest, apiRequest, syncCurrentUser } from '../lib/api'

const users = ref([])
const usersLoading = ref(false)
const pageError = ref('')
const search = ref('')
const selectedUserId = ref(null)
const showEditModal = ref(false)
const editForm = ref(null)
const editError = ref('')
const editSaving = ref(false)
const newSecurityCode = ref('')
const showSecurityCode = ref(false)
const securitySaving = ref(false)
const securityMessage = ref('')
const securityError = ref('')

const summary = ref({
  currentUser: null,
  activeUsers: 0,
  inactiveUsers: 0,
  registrationSecurityCodeConfigured: false,
  registrationSecurityCodeUpdatedAt: null,
})

const meta = ref({
  page: 1,
  pageSize: 8,
  total: 0,
  totalPages: 1,
})

const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value) ?? null)

const profileInitials = computed(() => {
  const fullName = summary.value.currentUser?.fullName ?? ''
  const [first = '', second = ''] = fullName.split(' ')
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase() || 'AD'
})

function formatDate(value, withTime = false) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString(undefined, withTime
    ? {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    : {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
}

async function loadUsers(page = meta.value.page) {
  usersLoading.value = true
  pageError.value = ''

  try {
    const payload = await apiJsonRequest('/users', {
      params: {
        page,
        pageSize: meta.value.pageSize,
        search: search.value.trim() || undefined,
      },
    })

    users.value = payload.data ?? []
    meta.value = payload.meta ?? meta.value
    summary.value = payload.summary ?? summary.value

    if (!selectedUserId.value || !users.value.some((user) => user.id === selectedUserId.value)) {
      selectedUserId.value = users.value[0]?.id ?? null
    }
  } catch (error) {
    pageError.value = error.message
    users.value = []
    selectedUserId.value = null
  } finally {
    usersLoading.value = false
  }
}

function selectUser(user) {
  selectedUserId.value = user.id
}

function openEditModal() {
  if (!selectedUser.value) {
    return
  }

  editError.value = ''
  editForm.value = {
    id: selectedUser.value.id,
    userId: selectedUser.value.userId,
    fullName: selectedUser.value.fullName,
    role: selectedUser.value.role,
    status: selectedUser.value.status,
    reason: selectedUser.value.reason ?? '',
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editForm.value = null
  editError.value = ''
}

async function saveUserChanges() {
  if (!editForm.value) {
    return
  }

  editSaving.value = true
  editError.value = ''

  try {
    const updatedUser = await apiRequest(`/users/${editForm.value.id}`, {
      method: 'PATCH',
      body: {
        role: editForm.value.role,
        status: editForm.value.status,
        reason: editForm.value.reason.trim() || undefined,
      },
    })

    users.value = users.value.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    syncCurrentUser(updatedUser)

    if (summary.value.currentUser?.id === updatedUser.id) {
      summary.value.currentUser = {
        ...summary.value.currentUser,
        ...updatedUser,
      }
    }

    await loadUsers(meta.value.page)
    closeEditModal()
  } catch (error) {
    editError.value = error.message
  } finally {
    editSaving.value = false
  }
}

async function updateSecurityCode() {
  securitySaving.value = true
  securityMessage.value = ''
  securityError.value = ''

  try {
    const data = await apiRequest('/users/registration-code', {
      method: 'PUT',
      body: {
        securityCode: newSecurityCode.value,
      },
    })

    summary.value.registrationSecurityCodeConfigured = data.configured
    summary.value.registrationSecurityCodeUpdatedAt = data.updatedAt
    securityMessage.value = 'Security code updated successfully.'
    newSecurityCode.value = ''
    showSecurityCode.value = false
  } catch (error) {
    securityError.value = error.message
  } finally {
    securitySaving.value = false
  }
}

function changePage(page) {
  if (page < 1 || page > meta.value.totalPages) {
    return
  }

  loadUsers(page)
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadUsers(1)
  }, 250)
})

onMounted(() => {
  loadUsers(1)
})
</script>

<style scoped>
.page {
  padding: 32px;
  background: #fff;
  min-height: 100vh;
}

.page-title {
  font-size: 32px;
  margin-bottom: 24px;
  color: #000;
}

.page-message {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
}

.error {
  background: #fff0ed;
  color: #b42318;
}

.success {
  background: #ecfdf3;
  color: #027a48;
}

.grid {
  display: grid;
  grid-template-columns: 340px 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
}

.card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  color: #000;
}

.profile-card {
  grid-column: 1 / 2;
  display: flex;
  gap: 18px;
  align-items: center;
}

.profile-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #2f2f2f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-icon {
  color: #fff;
  font-size: 30px;
  font-weight: 700;
}

.profile-text h2 {
  margin: 0;
  font-size: 20px;
}

.profile-text .role {
  margin: 4px 0;
  font-style: italic;
  color: #666;
  text-transform: capitalize;
}

.profile-text .started,
.profile-text .user-id {
  margin: 6px 0 0;
  color: #7c7c7c;
  font-size: 14px;
}

.stat-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-label {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 46px;
  margin: 10px 0 0;
}

.security-card {
  grid-column: 1 / 2;
  display: flex;
  flex-direction: column;
  min-height: 340px;
}

.security-card h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.security-note,
.security-meta,
.users-subtitle,
.modal-subtitle,
.sub-cell {
  color: #666;
  font-size: 13px;
}

.security-input-row {
  margin: 14px 0 8px;
}

.security-input,
.search-input,
.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  background: #f7f7f7;
  color: #111;
}

.show-code {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.security-btn,
.primary-btn,
.secondary-btn,
.edit-btn,
.page-btn {
  border-radius: 8px;
  cursor: pointer;
}

.security-btn,
.primary-btn {
  margin-top: 14px;
  padding: 10px 14px;
  border: none;
  background: #ff6b00;
  color: #fff;
  font-weight: 600;
}

.security-btn:disabled,
.primary-btn:disabled,
.edit-btn:disabled,
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-message {
  margin-top: 12px;
  font-size: 13px;
}

.users-card {
  grid-column: 2 / 4;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.users-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 220px;
  background: #fff;
}

.edit-btn,
.secondary-btn,
.page-btn {
  padding: 8px 12px;
  border: 1px solid #111;
  background: #fff;
  color: #111;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.users-table th,
.users-table td {
  border-bottom: 1px solid #e0e0e0;
  padding: 14px 12px;
  text-align: left;
  vertical-align: middle;
}

.users-table th {
  color: #888;
}

.users-table tr.selected {
  background: #fff5ed;
}

.name-cell {
  font-weight: 600;
}

.role-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: capitalize;
}

.role-pill {
  background: #f2f4f7;
  color: #344054;
}

.status-pill.active {
  background: #ecfdf3;
  color: #027a48;
}

.status-pill.inactive {
  background: #fff0ed;
  color: #b42318;
}

.table-state {
  text-align: center;
  color: #666;
}

.table-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #666;
  font-size: 13px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-count {
  min-width: 84px;
  text-align: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}

.field-label {
  display: block;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.modal-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .profile-card,
  .security-card,
  .users-card {
    grid-column: auto;
  }

  .users-header,
  .users-actions,
  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }
}
</style>

