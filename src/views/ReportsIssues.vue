<template>
  <div class="page">
    <div class="card">
      <div class="page-header">
        <h2>Reports / Issues</h2>
        <button class="btn" :disabled="!selectedIssue || loading" @click="openEdit">Edit</button>
      </div>

      <div class="controls">
        <input type="text" placeholder="Search Tracking Number" v-model="search" />
        <button class="btn filter" @click="openFilter">Filter</button>
      </div>

      <p v-if="pageError" class="page-message error">{{ pageError }}</p>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Tracking Number</th>
            <th>Date Reported</th>
            <th>Remarks</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="table-state">Loading reports...</td>
          </tr>
          <tr v-else-if="issues.length === 0">
            <td colspan="5" class="table-state">No reports found.</td>
          </tr>
          <tr
            v-for="issue in issues"
            :key="issue.id"
            @click="toggleSelection(issue)"
            :class="{ selected: selectedIssueId === issue.id }"
          >
            <td><input type="radio" name="selectedIssue" :checked="selectedIssueId === issue.id" /></td>
            <td>{{ issue.trackingNumber }}</td>
            <td>{{ formatDate(issue.reportedAt) }}</td>
            <td class="remarks">{{ issue.remarks }}</td>
            <td><span :class="['status', issue.status.toLowerCase()]">{{ issue.status }}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer">
        <div class="pagination" v-if="meta.totalPages > 1">
          <div class="pagination-buttons">
            <button class="page-btn" :disabled="meta.page === 1 || loading" @click="changePage(1)"><<</button>
            <button class="page-btn" :disabled="meta.page === 1 || loading" @click="changePage(meta.page - 1)"><</button>
            <button v-for="page in visiblePages" :key="page" class="page-btn" :class="{ active: meta.page === page }" @click="changePage(page)">{{ page }}</button>
            <button class="page-btn" :disabled="meta.page === meta.totalPages || loading" @click="changePage(meta.page + 1)">></button>
            <button class="page-btn" :disabled="meta.page === meta.totalPages || loading" @click="changePage(meta.totalPages)">>></button>
          </div>

          <span class="page-info">Page {{ meta.page }} of {{ meta.totalPages }}</span>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-backdrop" @click.self="closeEdit">
      <div class="modal edit-modal">
        <button class="modal-close" @click="closeEdit">x</button>
        <h3>Edit Reports / Issues</h3>

        <div class="form-group">
          <label>Tracking Number</label>
          <div class="readonly-box">{{ editForm.trackingNumber }}</div>
        </div>

        <div class="form-group">
          <label>Remarks</label>
          <textarea v-model="editForm.remarks" placeholder="Enter text" class="remarks-textbox"></textarea>
        </div>

        <div class="form-group">
          <label>Edit Status</label>
          <div class="status-options">
            <label><input type="radio" value="Unresolved" v-model="editForm.status" /> Unresolved</label>
            <label><input type="radio" value="Resolved" v-model="editForm.status" /> Resolved</label>
          </div>
        </div>

        <p v-if="editError" class="page-message error">{{ editError }}</p>

        <div class="form-actions">
          <button class="btn primary update-btn" @click="updateIssue" :disabled="savingEdit">{{ savingEdit ? 'Saving...' : 'Update' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showFilterPopup" class="filter-backdrop" @click.self="closeFilter">
      <div class="filter-popup">
        <h4>Status</h4>
        <div class="filter-group">
          <label><input type="checkbox" v-model="filterStatus.Resolved" /> Resolved</label>
          <label><input type="checkbox" v-model="filterStatus.Unresolved" /> Unresolved</label>
        </div>

        <div class="filter-actions">
          <button class="btn" @click="clearFilter">Clear</button>
          <button class="btn primary" @click="closeFilter">Apply</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { apiJsonRequest, apiRequest } from '../lib/api'

const search = ref('')
const selectedIssueId = ref(null)
const showEditModal = ref(false)
const showFilterPopup = ref(false)
const loading = ref(false)
const savingEdit = ref(false)
const pageError = ref('')
const editError = ref('')
const issues = ref([])
const pageSize = 15
const maxVisiblePages = 3
const meta = ref({ page: 1, pageSize, total: 0, totalPages: 1 })
let filterTimer = null

const filterStatus = ref({ Resolved: false, Unresolved: false })
const selectedIssue = computed(() => issues.value.find(issue => issue.id === selectedIssueId.value) ?? null)
const editForm = ref({ id: '', trackingNumber: '', remarks: '', status: 'Unresolved' })

const visiblePages = computed(() => {
  const pages = []
  let start = meta.value.page - 1
  let end = meta.value.page + 1

  if (start < 1) {
    start = 1
    end = Math.min(maxVisiblePages, meta.value.totalPages)
  }

  if (end > meta.value.totalPages) {
    end = meta.value.totalPages
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
})

function buildReportParams(page = meta.value.page) {
  const activeStatuses = Object.keys(filterStatus.value).filter(key => filterStatus.value[key])
  return {
    page,
    pageSize,
    search: search.value.trim() || undefined,
    status: activeStatuses.length ? activeStatuses.join(',') : undefined,
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

async function loadReports(page = meta.value.page) {
  loading.value = true
  pageError.value = ''

  try {
    const payload = await apiJsonRequest('/reports', { params: buildReportParams(page) })
    issues.value = payload.data ?? []
    meta.value = payload.meta ?? meta.value

    if (!selectedIssueId.value || !issues.value.some(issue => issue.id === selectedIssueId.value)) {
      selectedIssueId.value = issues.value[0]?.id ?? null
    }
  } catch (error) {
    pageError.value = error.message
    issues.value = []
    selectedIssueId.value = null
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  if (page < 1 || page > meta.value.totalPages) return
  loadReports(page)
}

function toggleSelection(issue) {
  selectedIssueId.value = selectedIssueId.value === issue.id ? null : issue.id
}

function openEdit() {
  if (!selectedIssue.value) return
  editError.value = ''
  editForm.value = {
    id: selectedIssue.value.id,
    trackingNumber: selectedIssue.value.trackingNumber,
    remarks: selectedIssue.value.remarks,
    status: selectedIssue.value.status,
  }
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
}

async function updateIssue() {
  savingEdit.value = true
  editError.value = ''

  try {
    await apiRequest(`/reports/${editForm.value.id}`, {
      method: 'PATCH',
      body: {
        remarks: editForm.value.remarks,
        status: editForm.value.status,
      },
    })
    closeEdit()
    await loadReports(meta.value.page)
  } catch (error) {
    editError.value = error.message
  } finally {
    savingEdit.value = false
  }
}

function openFilter() {
  showFilterPopup.value = true
}

function closeFilter() {
  showFilterPopup.value = false
}

function clearFilter() {
  filterStatus.value.Resolved = false
  filterStatus.value.Unresolved = false
}

watch([search, filterStatus], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadReports(1), 250)
}, { deep: true })

onMounted(() => {
  loadReports(1)
})
</script>

<style scoped>
.page { padding: 24px; background: #f5f6f8; min-height: 100vh; }
.card { background: #fff; border-radius: 10px; padding: 20px; color: #000; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 25px; }
.controls { display: flex; justify-content: space-between; margin-bottom: 12px; }
.controls input { background: #ffffff; color: #000000; padding: 8px 12px; border-radius: 4px; border: 1px solid #000; width: 240px; }
.page-message { margin-bottom: 12px; font-size: 13px; }
.page-message.error { color: #a32900; }
.table-state { text-align: center; color: #666; }
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { padding: 12px; border-bottom: 1px solid #eaeaea; text-align: center; }
.remarks { text-align: left; white-space: normal; word-break: break-word; }
.status { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 500; }
.status.resolved { background: #5fbf8f; color: #fff; }
.status.unresolved { background: #c0392b; color: #fff; }
tr.selected td { background: #e6e6e6; }
.btn { padding: 8px 14px; border: 1px solid #000; border-radius: 6px; background: #fff; cursor: pointer; color: #000; }
.btn.primary { background: #888b8e; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-backdrop, .filter-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(4px); z-index: 999; color: #000; }
.modal { background: #fff; padding: 30px; width: 345px; border-radius: 8px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #000; border: 2px solid #000; }
.modal-close { position: absolute; top: 10px; right: 12px; background: none; border: none; font-size: 22px; cursor: pointer; color: #000 !important; }
.filter-popup { position: absolute; top: 180px; right: 80px; background: #fff; border: 1px solid #000; padding: 16px; width: 280px; border-radius: 8px; }
.filter-group { display: flex; flex-direction: row; justify-content: center; gap: 40px; font-size: 13px; align-items: center; }
.filter-actions { display: flex; justify-content: center; gap: 18px; margin-top: 20px; }
.filter-actions .btn { padding: 6px 14px; font-size: 13px; }
.filter-popup h4 { margin: 8px 0; font-size: 20px; }
.edit-modal { width: 360px; }
.edit-modal h3 { text-align: center; margin-bottom: 18px; }
.edit-modal .form-group { margin-bottom: 14px; }
.edit-modal input, .edit-modal textarea { width: 100%; padding: 8px; background: #f0f0f0; border: 1px solid #000; border-radius: 4px; font-size: 14px; }
.edit-modal textarea { resize: vertical; }
.readonly-box { padding: 8px; background: #f0f0f0; border: 1px solid #000; border-radius: 4px; font-size: 14px; }
.status-options { display: flex; justify-content: center; gap: 30px; border: 1px solid #000; padding: 10px; border-radius: 4px; }
.status-options label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.update-btn { width: 160px; padding: 10px 0; }
.remarks-textbox { color: #000000; background: #f0f0f0; border: 1px solid #000; border-radius: 4px; padding: 8px; font-size: 14px; width: 100%; }
.form-actions { display: flex; justify-content: center; margin-top: 22px; }
.table-footer { padding: 0 45px; }
.pagination { position: relative; left: 50%; transform: translateX(-50%); width: max-content; margin-top: 16px; }
.pagination-buttons { display: flex; gap: 6px; }
.page-btn { padding: 6px 12px; border: 1px solid #000; background: #fff; cursor: pointer; border-radius: 4px; color: #000; }
.page-btn.active { background: #888b8e; color: #fff; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: #444; margin: 0 8px; white-space: nowrap; position: relative; left: 30%; }
</style>
