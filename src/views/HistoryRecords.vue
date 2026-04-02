<template>
  <div class="page">
    <div class="card">
      <div class="page-header">
        <h2>History Records</h2>
        <button class="btn primary" @click="downloadCSV" :disabled="isDownloading">
          {{ isDownloading ? 'Downloading...' : 'Download CSV' }}
        </button>
      </div>

      <div class="controls">
        <input type="text" placeholder="Search Tracking Number" v-model="search" />

        <div class="controls-right">
          <div class="date-filter">
            <div v-if="selectedRangeText" class="date-range-box">
              <span>{{ selectedRangeText }}</span>
              <button class="clear-btn" @click="clearDateFilter">X</button>
            </div>

            <button class="btn calendar-btn" @click="openCalendar">
              <img src="../assets/calendar.png" alt="calendar" />
            </button>
          </div>
        </div>

        <input ref="calendarInput" type="text" class="calendar-hidden-input" />
      </div>

      <p v-if="pageError" class="page-message error">{{ pageError }}</p>

      <table>
        <thead>
          <tr>
            <th>Tracking Number</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="3" class="table-state">Loading history...</td>
          </tr>
          <tr v-else-if="records.length === 0">
            <td colspan="3" class="table-state">No history records found.</td>
          </tr>
          <tr v-for="record in records" :key="record.id">
            <td>{{ record.trackingNumber || '-' }}</td>
            <td>{{ formatDate(record.date) }}</td>
            <td>{{ record.action }}</td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer" v-if="meta.totalPages > 1">
        <div class="pagination">
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
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'
import { apiJsonRequest, downloadFile } from '../lib/api'

const search = ref('')
const calendarInput = ref(null)
const dateRange = ref([])
const records = ref([])
const loading = ref(false)
const pageError = ref('')
const isDownloading = ref(false)
const meta = ref({ page: 1, pageSize: 10, total: 0, totalPages: 1 })
const maxVisiblePages = 3
let calendarInstance = null
let filterTimer = null

const selectedRangeText = computed(() => {
  if (dateRange.value.length !== 2) return ''
  const [start, end] = dateRange.value
  return `${start.toISOString().slice(0, 10)} - ${end.toISOString().slice(0, 10)}`
})

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

function buildHistoryParams(page = meta.value.page) {
  return {
    page,
    pageSize: meta.value.pageSize,
    search: search.value.trim() || undefined,
    dateFrom: dateRange.value[0] ? dateRange.value[0].toISOString().slice(0, 10) : undefined,
    dateTo: dateRange.value[1] ? dateRange.value[1].toISOString().slice(0, 10) : undefined,
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function openCalendar() {
  calendarInstance?.open()
}

function clearDateFilter() {
  dateRange.value = []
  calendarInstance?.clear()
}

async function loadHistory(page = meta.value.page) {
  loading.value = true
  pageError.value = ''

  try {
    const payload = await apiJsonRequest('/history', { params: buildHistoryParams(page) })
    records.value = payload.data ?? []
    meta.value = payload.meta ?? meta.value
  } catch (error) {
    pageError.value = error.message
    records.value = []
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  if (page < 1 || page > meta.value.totalPages) return
  loadHistory(page)
}

async function downloadCSV() {
  isDownloading.value = true

  try {
    await downloadFile('/history/export.csv', {
      params: buildHistoryParams(),
      filename: 'history-records.csv',
    })
  } catch (error) {
    alert(error.message)
  } finally {
    isDownloading.value = false
  }
}

watch([search, dateRange], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => loadHistory(1), 250)
}, { deep: true })

onMounted(() => {
  calendarInstance = flatpickr(calendarInput.value, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    clickOpens: false,
    onChange(selectedDates) {
      dateRange.value = [...selectedDates]
    },
  })

  loadHistory(1)
})
</script>

<style scoped>
.page { padding: 24px; background: #f5f6f8; min-height: 100vh; }
.card { background: white; border-radius: 10px; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 25px; color: #000; }
.controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
.controls input { width: 240px; padding: 8px 12px; border: 1px solid #000; border-radius: 4px; color: #000; background: white; }
.controls-right { display: flex; align-items: center; gap: 8px; }
.calendar-btn { padding: 6px 12px; font-size: 18px; border: none; background: #f5f5f5; cursor: pointer; flex-shrink: 0; border-radius: 6px; border: 1px solid #000; }
.calendar-btn img { width: 20px; height: 20px; }
.calendar-hidden-input { position: absolute; opacity: 0; pointer-events: none; }
.date-filter { display: flex; align-items: center; gap: 6px; }
.date-range-box { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #000; border-radius: 6px; background: #f1f1f1; font-size: 13px; color: #000; }
.clear-btn { background: transparent; border: none; font-weight: bold; cursor: pointer; font-size: 14px; color: #c50c0c; padding: 0; }
.page-message { margin-bottom: 12px; font-size: 13px; }
.page-message.error { color: #a32900; }
.table-state { text-align: center; color: #666; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 12px 20px; border-bottom: 1px solid #ccc; text-align: center; color: #000; }
th { font-weight: 600; color: #444; }
.table-footer { margin-top: 16px; display: flex; justify-content: center; align-items: center; gap: 12px; }
.pagination { display: flex; gap: 6px; }
.page-btn { padding: 6px 12px; border: 1px solid #000; background: #fff; cursor: pointer; border-radius: 4px; color: #000; transition: all 0.15s ease; user-select: none; }
.page-btn.active { background: #888b8e; color: #fff; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: #444; }
.btn.primary { background-color: #777777; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background-color 0.25s ease; user-select: none; box-shadow: 0 3px 6px rgba(0, 82, 204, 0.4); }
.btn.primary:disabled { background-color: #a0a8b9; cursor: not-allowed; box-shadow: none; color: #d0d4db; }
</style>
