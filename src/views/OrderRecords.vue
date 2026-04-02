<template>
  <div class="page">
    <div class="card">
      <div class="page-header">
        <h2>Order Records</h2>
        <div class="header-actions">
          <button class="btn primary" @click="openAddParcelModal">+ Add Parcel</button>
          <button class="btn" :disabled="!selectedParcel || parcelsLoading" @click="openEdit">Edit</button>
        </div>
      </div>

      <div class="controls">
        <input type="text" placeholder="Search Tracking Number" v-model="search" />

        <div class="controls-right">
          <div class="date-filter">
            <div v-if="selectedRangeText" class="date-range-box">
              <span>{{ selectedRangeText }}</span>
              <button class="clear-btn" @click="clearDateFilter">X</button>
            </div>

            <button ref="calendarBtn" class="btn calendar-btn" @click="openCalendar">
              <img src="../assets/calendar.png" alt="calendar" />
            </button>
            <input ref="calendarInput" type="text" class="calendar-hidden-input" />
          </div>

          <button class="btn filter" @click="openFilter">Filter</button>
        </div>
      </div>

      <p v-if="pageError" class="page-message error">{{ pageError }}</p>

      <div class="scan-panel">
        <div class="scan-panel-left">
          <label class="scan-label" for="scan-waybill">Scan Waybill</label>
          <input
            id="scan-waybill"
            ref="scanInput"
            v-model="scanTracking"
            type="text"
            class="scan-input"
            placeholder="Scan or enter tracking number"
            @keydown.enter.prevent="submitScan"
          />
        </div>
        <div class="scan-panel-actions">
          <button class="btn primary" @click="submitScan" :disabled="scanningParcel">{{ scanningParcel ? 'Scanning...' : 'Scan' }}</button>
        </div>
      </div>

      <p v-if="scanFeedback" class="page-message" :class="scanFeedbackType === 'error' ? 'error' : 'success'">{{ scanFeedback }}</p>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Tracking Number</th>
            <th>Platform</th>
            <th>Date Added</th>
            <th>Outbound Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="parcelsLoading">
            <td colspan="6" class="table-state">Loading parcels...</td>
          </tr>
          <tr v-else-if="parcels.length === 0">
            <td colspan="6" class="table-state">No parcels found.</td>
          </tr>
          <tr
            v-for="parcel in parcels"
            :key="parcel.id"
            @click="toggleSelection(parcel)"
            :class="{ selected: selectedParcelId === parcel.id }"
          >
            <td><input type="radio" name="selectedParcel" :checked="selectedParcelId === parcel.id" /></td>
            <td>{{ parcel.trackingNumber }}</td>
            <td>{{ parcel.platform }}</td>
            <td>{{ formatDate(parcel.dateAdded) }}</td>
            <td>{{ formatDate(parcel.outboundDate) }}</td>
            <td><span :class="['status', formatStatus(parcel.status)]">{{ parcel.status }}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer">
        <div class="pagination" v-if="meta.totalPages > 1">
          <div class="pagination-buttons">
            <button class="page-btn" :disabled="meta.page === 1 || parcelsLoading" @click="changePage(1)"><<</button>
            <button class="page-btn" :disabled="meta.page === 1 || parcelsLoading" @click="changePage(meta.page - 1)"><</button>
            <button v-for="page in visiblePages" :key="page" class="page-btn" :class="{ active: meta.page === page }" @click="changePage(page)">{{ page }}</button>
            <button class="page-btn" :disabled="meta.page === meta.totalPages || parcelsLoading" @click="changePage(meta.page + 1)">></button>
            <button class="page-btn" :disabled="meta.page === meta.totalPages || parcelsLoading" @click="changePage(meta.totalPages)">>></button>
          </div>
          <span class="page-info">Page {{ meta.page }} of {{ meta.totalPages }}</span>
        </div>
      </div>
    </div>

    <div v-if="showAddParcelModal" class="modal-backdrop" @click.self="closeAddParcelModal">
      <div class="modal">
        <button class="modal-close" @click="closeAddParcelModal">x</button>
        <h3>Add Parcel</h3>

        <div class="form-group">
          <label>Tracking Number</label>
          <input v-model="addForm.tracking" placeholder="Enter tracking number" type="text" :disabled="!addForm.manualInput" />
        </div>

        <div class="form-group checkbox-row">
          <label><input type="checkbox" v-model="addForm.manualInput" /> Manual Input</label>
        </div>

        <div class="form-group">
          <label>Platform</label>
          <select v-model="addForm.platform">
            <option disabled value="">Select platform</option>
            <option v-for="platform in platforms" :key="platform">{{ platform }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Status</label>
          <select v-model="addForm.status">
            <option disabled value="">Select status</option>
            <option v-for="status in statuses" :key="status">{{ status }}</option>
          </select>
        </div>

        <p v-if="addError" class="panel-message error">{{ addError }}</p>

        <div class="form-actions">
          <button class="btn primary" @click="submitAddParcel" :disabled="savingAddParcel">{{ savingAddParcel ? 'Saving...' : 'Add Parcel' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-backdrop" @click.self="closeEdit">
      <div class="modal">
        <button class="modal-close" @click="closeEdit">x</button>
        <h3>Edit Order</h3>

        <div class="form-group">
          <label>Tracking Number</label>
          <input v-model="editForm.trackingNumber" disabled />
        </div>

        <div class="form-group">
          <label>Edit Platform</label>
          <select v-model="editForm.platform">
            <option v-for="platform in platforms" :key="platform">{{ platform }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Edit Status</label>
          <select v-model="editForm.status">
            <option v-for="status in statuses" :key="status">{{ status }}</option>
          </select>
        </div>

        <p v-if="editError" class="panel-message error">{{ editError }}</p>

        <div class="form-actions">
          <button class="btn primary" @click="updateParcel" :disabled="savingEditParcel">{{ savingEditParcel ? 'Saving...' : 'Update' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showReportModal" class="modal-backdrop" @click.self="closeReportModal">
      <div class="modal">
        <button class="modal-close" @click="closeReportModal">x</button>
        <h3>Report Issue</h3>

        <div class="form-group">
          <label>Tracking Number</label>
          <input :value="selectedParcel?.trackingNumber ?? ''" disabled />
        </div>

        <div class="form-group">
          <label>Remarks</label>
          <textarea v-model="reportForm.remarks" class="remarks-box" placeholder="Describe the issue"></textarea>
        </div>

        <p v-if="reportError" class="panel-message error">{{ reportError }}</p>

        <div class="form-actions">
          <button class="btn primary" @click="submitReport" :disabled="savingReport">{{ savingReport ? 'Submitting...' : 'Submit Report' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showFilterPopup" class="filter-backdrop" @click.self="closeFilter">
      <div class="filter-popup">
        <h4>Status</h4>
        <div class="filter-group">
          <label v-for="(value, key) in filterStatus" :key="key"><input type="checkbox" v-model="filterStatus[key]" /> {{ key }}</label>
        </div>

        <h4>Platform</h4>
        <div class="filter-group">
          <label v-for="(value, key) in filterPlatform" :key="key"><input type="checkbox" v-model="filterPlatform[key]" /> {{ key }}</label>
        </div>

        <div class="filter-actions">
          <button class="btn" @click="clearFilter">Clear</button>
          <button class="btn primary" @click="closeFilter">Filter</button>
        </div>
      </div>
    </div>

    <div class="card-buttons">
      <button class="btn primary" @click="downloadCSV" :disabled="isDownloading">{{ isDownloading ? 'Downloading...' : 'Download CSV' }}</button>
      <button class="btn" :disabled="!selectedParcel || savingReport" @click="openReportModal">Report Issues</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'
import { apiJsonRequest, apiRequest, downloadFile } from '../lib/api'

const platforms = ['J&T', 'Shopee', 'NinjaVan', 'Lazada']
const statuses = ['Pending', 'Outbound', 'Cancelled', 'Returned', 'Double Waybill']
const pageSize = 15
const maxVisiblePages = 3

const search = ref('')
const parcels = ref([])
const selectedParcelId = ref(null)
const showEditModal = ref(false)
const showAddParcelModal = ref(false)
const showReportModal = ref(false)
const showFilterPopup = ref(false)
const isDownloading = ref(false)
const parcelsLoading = ref(false)
const savingAddParcel = ref(false)
const savingEditParcel = ref(false)
const savingReport = ref(false)
const pageError = ref('')
const addError = ref('')
const editError = ref('')
const reportError = ref('')
const scanTracking = ref('')
const scanningParcel = ref(false)
const scanFeedback = ref('')
const scanFeedbackType = ref('success')
const scanInput = ref(null)

const meta = ref({ page: 1, pageSize, total: 0, totalPages: 1 })
const calendarInput = ref(null)
const calendarBtn = ref(null)
const dateRange = ref([])
let calendarInstance = null
let filterTimer = null

const addForm = ref({ tracking: '', manualInput: true, platform: '', status: '' })
const editForm = ref({ id: '', trackingNumber: '', platform: '', status: '' })
const reportForm = ref({ remarks: '' })

const filterStatus = ref({ Pending: false, Outbound: false, Cancelled: false, Returned: false, 'Double Waybill': false })
const filterPlatform = ref({ 'J&T': false, Shopee: false, NinjaVan: false, Lazada: false })

const selectedParcel = computed(() => parcels.value.find(parcel => parcel.id === selectedParcelId.value) ?? null)

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

const selectedRangeText = computed(() => {
  if (dateRange.value.length !== 2) return ''
  const [start, end] = dateRange.value
  const toISO = date => date.toISOString().slice(0, 10)
  return `${toISO(start)} - ${toISO(end)}`
})

function formatStatus(status) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildParcelParams(page = meta.value.page) {
  const activeStatuses = Object.keys(filterStatus.value).filter(key => filterStatus.value[key])
  const activePlatforms = Object.keys(filterPlatform.value).filter(key => filterPlatform.value[key])

  return {
    page,
    pageSize,
    search: search.value.trim() || undefined,
    status: activeStatuses.length ? activeStatuses.join(',') : undefined,
    platform: activePlatforms.length ? activePlatforms.join(',') : undefined,
    dateFrom: dateRange.value[0] ? dateRange.value[0].toISOString().slice(0, 10) : undefined,
    dateTo: dateRange.value[1] ? dateRange.value[1].toISOString().slice(0, 10) : undefined,
  }
}

async function loadParcels(page = meta.value.page) {
  parcelsLoading.value = true
  pageError.value = ''

  try {
    const payload = await apiJsonRequest('/parcels', { params: buildParcelParams(page) })
    parcels.value = payload.data ?? []
    meta.value = payload.meta ?? meta.value

    if (!selectedParcelId.value || !parcels.value.some(parcel => parcel.id === selectedParcelId.value)) {
      selectedParcelId.value = parcels.value[0]?.id ?? null
    }
  } catch (error) {
    pageError.value = error.message
    parcels.value = []
    selectedParcelId.value = null
  } finally {
    parcelsLoading.value = false
  }
}

function toggleSelection(parcel) {
  selectedParcelId.value = selectedParcelId.value === parcel.id ? null : parcel.id
}

function changePage(page) {
  if (page < 1 || page > meta.value.totalPages) return
  loadParcels(page)
}

function openCalendar() {
  calendarInstance?.open()
}

function clearDateFilter() {
  dateRange.value = []
  calendarInstance?.clear()
}

function openFilter() {
  showFilterPopup.value = true
}

function closeFilter() {
  showFilterPopup.value = false
}

function clearFilter() {
  Object.keys(filterStatus.value).forEach(key => { filterStatus.value[key] = false })
  Object.keys(filterPlatform.value).forEach(key => { filterPlatform.value[key] = false })
}

async function submitScan() {
  const trackingNumber = scanTracking.value.trim()

  if (!trackingNumber) {
    scanFeedbackType.value = 'error'
    scanFeedback.value = 'Please scan or enter a tracking number.'
    return
  }

  scanFeedback.value = ''
  scanningParcel.value = true

  try {
    const parcel = await apiRequest('/parcels/scan', {
      method: 'POST',
      body: { trackingNumber },
    })

    scanFeedbackType.value = 'success'
    scanFeedback.value = `${parcel.trackingNumber} moved to ${parcel.status}.`
    scanTracking.value = ''
    await loadParcels(1)
    selectedParcelId.value = parcel.id
    scanInput.value?.focus()
  } catch (error) {
    scanFeedbackType.value = 'error'
    scanFeedback.value = error.message
    scanInput.value?.focus()
  } finally {
    scanningParcel.value = false
  }
}

function openAddParcelModal() {
  addError.value = ''
  addForm.value = { tracking: '', manualInput: true, platform: '', status: '' }
  showAddParcelModal.value = true
}

function closeAddParcelModal() {
  showAddParcelModal.value = false
}

async function submitAddParcel() {
  addError.value = ''
  savingAddParcel.value = true

  try {
    await apiRequest('/parcels', {
      method: 'POST',
      body: {
        trackingNumber: addForm.value.tracking,
        platform: addForm.value.platform,
        status: addForm.value.status,
      },
    })
    closeAddParcelModal()
    await loadParcels(1)
  } catch (error) {
    addError.value = error.message
  } finally {
    savingAddParcel.value = false
  }
}

function openEdit() {
  if (!selectedParcel.value) return
  editError.value = ''
  editForm.value = {
    id: selectedParcel.value.id,
    trackingNumber: selectedParcel.value.trackingNumber,
    platform: selectedParcel.value.platform,
    status: selectedParcel.value.status,
  }
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
}

async function updateParcel() {
  editError.value = ''
  savingEditParcel.value = true

  try {
    await apiRequest(`/parcels/${editForm.value.id}`, {
      method: 'PATCH',
      body: {
        platform: editForm.value.platform,
        status: editForm.value.status,
      },
    })
    closeEdit()
    await loadParcels(meta.value.page)
  } catch (error) {
    editError.value = error.message
  } finally {
    savingEditParcel.value = false
  }
}

function openReportModal() {
  if (!selectedParcel.value) return
  reportError.value = ''
  reportForm.value = { remarks: '' }
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
}

async function submitReport() {
  if (!selectedParcel.value) return
  reportError.value = ''
  savingReport.value = true

  try {
    await apiRequest('/reports', {
      method: 'POST',
      body: {
        trackingNumber: selectedParcel.value.trackingNumber,
        remarks: reportForm.value.remarks,
        status: 'Unresolved',
      },
    })
    closeReportModal()
    window.alert('Report submitted successfully.')
  } catch (error) {
    reportError.value = error.message
  } finally {
    savingReport.value = false
  }
}

async function downloadCSV() {
  isDownloading.value = true
  try {
    await downloadFile('/parcels/export.csv', {
      params: buildParcelParams(),
      filename: 'order-records.csv',
    })
  } catch (error) {
    alert(error.message)
  } finally {
    isDownloading.value = false
  }
}

watch([search, dateRange, filterStatus, filterPlatform], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadParcels(1), 250)
}, { deep: true })

onMounted(() => {
  calendarInstance = flatpickr(calendarInput.value, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    clickOpens: false,
    positionElement: calendarBtn.value,
    position: 'auto',
    onChange(selectedDates) {
      dateRange.value = [...selectedDates]
    },
  })
  loadParcels(1)
  scanInput.value?.focus()
})
</script>

<style scoped>
.page { padding: 24px; background: #f5f6f8; min-height: 100vh; }
.card { background: #ffffff; border-radius: 10px; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: #000000; font-size: 25px; }
.header-actions { display: flex; gap: 12px; }
.controls { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.controls-right { display: flex; align-items: center; gap: 8px; }
.controls input { background: #ffffff; color: #000000; padding: 8px 12px; border-radius: 4px; border: 1px solid #000; width: 240px; }
.calendar-btn { 
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px; 
  background: #ffffff; 
  cursor: pointer; 
  flex-shrink: 0; 
  width: 38px;
  height: 38px;
}
.calendar-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.calendar-hidden-input { position: absolute; opacity: 0; pointer-events: none; }
.date-filter { position: relative; display: flex; align-items: center; gap: 6px; }
.date-range-box { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #000; border-radius: 6px; background: #f1f1f1; font-size: 13px; color: #000000; }
.clear-btn { background: transparent; border: none; font-weight: bold; cursor: pointer; font-size: 14px; line-height: 1; color: #c50c0c; padding: 0; }
.page-message, .panel-message { margin-top: 12px; font-size: 13px; }
.error { color: #a32900; }
.success { color: #1f7a1f; }
.scan-panel { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-top: 16px; margin-bottom: 10px; flex-wrap: wrap; }
.scan-panel-left { display: flex; flex-direction: column; gap: 6px; min-width: 280px; flex: 1; }
.scan-panel-actions { display: flex; align-items: end; }
.scan-label { font-size: 12px; color: #444; }
.scan-input { background: #ffffff; color: #000000; padding: 10px 12px; border-radius: 6px; border: 1px solid #000; width: 100%; }
.table-state { text-align: center; color: #666; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; margin-top: 18px; }
th, td { padding: 11px 32px; border-bottom: 1px solid #eaeaea; color: #000000; }
th:nth-child(2), td:nth-child(2) { width: 24%; } th:nth-child(3), td:nth-child(3) { width: 16%; } th:nth-child(4), td:nth-child(4) { width: 18%; } th:nth-child(5), td:nth-child(5) { width: 18%; } th:nth-child(6), td:nth-child(6) { width: 24%; }
th { font-weight: 600; color: #444; }
.status { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 500; color: #000000; }
.status.pending { background: #ffd54f; color: #333; } .status.returned { background: #b3c7ff; } .status.outbound { background: #d7a6ff; } .status.cancelled { background: #ffa6a6; } .status.double-waybill { background: #9be59b; }
.btn { padding: 8px 14px; border-radius: 6px; border: 1px solid #000; cursor: pointer; background: #ffffff; color: #000000; font-size: 15px; }
.btn.primary { background: #888b8e; color: #fff; }
.btn.filter { background: #ffffff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal { position: relative; background: #ffffff; padding: 32px; border: 1px solid #000; width: 360px; color: #000000; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.modal h3 { text-align: center; margin-bottom: 15px; }
.modal-close { position: absolute; top: 10px; right: 12px; background: transparent; border: none; font-size: 22px; cursor: pointer; color: #000; }
.form-group { display: flex; flex-direction: column; margin-bottom: 12px; }
.form-group label { font-size: 12px; margin-bottom: 4px; }
.form-group input, .form-group select, .remarks-box { padding: 8px; color: #000000; background: #e7e7e7; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
.checkbox-row label { display: flex; align-items: center; gap: 8px; }
.remarks-box { min-height: 110px; resize: vertical; }
.form-actions { display: flex; justify-content: center; margin-top: 22px; }
.filter-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 9999; }
.filter-popup { position: absolute; top: 240px; right: 80px; background: #fff; border: 1px solid #000; padding: 16px; width: 260px; border-radius: 8px; color: #000000; }
.filter-popup h4 { margin: 8px 0; font-size: 14px; }
.filter-group { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; }
.filter-group label { display: flex; gap: 6px; align-items: center; color: #000000; }
.filter-actions { display: flex; justify-content: space-between; margin-top: 14px; }
.card-buttons { display: flex; justify-content: flex-end; margin-top: 8px; gap: 12px; margin-right: 30px; }
td:first-child, th:first-child { width: 40px; padding-left: 8px; text-align: center; }
input[type='radio'] { margin: 0; transform: scale(1); }
table td { text-align: center; vertical-align: middle; }
tr.selected td { background-color: #e6e6e6; }
.pagination { position: relative; left: 50%; transform: translateX(-50%); width: max-content; margin-top: 16px; }
.pagination-buttons { display: flex; gap: 6px; }
.page-btn { padding: 6px 12px; border: 1px solid #000; background: #fff; cursor: pointer; border-radius: 4px; color: #000000; transition: all 0.15s ease; }
.page-btn.active { background: #888b8e; color: #fff; }
.page-info { font-size: 13px; color: #444; margin: 0 8px; white-space: nowrap; position: relative; left: 30%; }
.table-footer { padding: 0 45px; }
</style>
