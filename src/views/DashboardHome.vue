<template>
  <div>
    <div class="topbar">
      <h1>Monthly Report</h1>
      <div class="topbar-right">
        <span class="date">{{ summary.monthLabel }}</span>
        <button class="icon-btn" @click="goToPreviousMonth"><</button>
        <button class="icon-btn" @click="goToNextMonth">></button>
      </div>
    </div>

    <p v-if="errorMessage" class="page-message error">{{ errorMessage }}</p>

    <div class="stats">
      <div v-for="item in stats" :key="item.label" class="stat-card">
        <p>{{ item.label }}</p>
        <h2>{{ item.value }}</h2>
      </div>
    </div>

    <section class="card">
      <h3>Unresolved Reports</h3>
      <div v-if="loading" class="empty-state">Loading reports...</div>
      <template v-else-if="summary.unresolvedReports.length">
        <div v-for="report in summary.unresolvedReports" :key="report.id" class="list-row">
          <span class="error">x</span>
          <span>{{ report.trackingNumber }} - {{ truncate(report.remarks, 42) }}</span>
          <span class="date-right">{{ formatDate(report.reportedAt) }}</span>
        </div>
      </template>
      <div v-else class="empty-state">No unresolved reports this month.</div>
      <button class="link" @click="router.push('/dashboard/reports-issues')">Go to Report/Issue Tab</button>
    </section>

    <div class="bottom">
      <section class="card">
        <h3>History Records</h3>
        <div v-if="loading" class="empty-state">Loading activity...</div>
        <template v-else-if="summary.recentHistory.length">
          <div v-for="entry in summary.recentHistory" :key="entry.id" class="history-row" :class="historyClass(entry.action)">
            {{ entry.trackingNumber ? `${entry.trackingNumber} - ` : '' }}{{ entry.action }}
          </div>
        </template>
        <div v-else class="empty-state">No recent history yet.</div>
        <button class="link" @click="router.push('/dashboard/history-records')">View Full History Records Tab</button>
      </section>

      <section class="card chart">
        <h3>Parcel Status Chart</h3>
        <div class="chart-bars" v-if="summary.chart.length">
          <div v-for="item in summary.chart" :key="item.label" class="chart-row">
            <span class="chart-label">{{ item.label }}</span>
            <div class="chart-track"><div class="chart-fill" :style="{ width: `${chartWidth(item.value)}%` }"></div></div>
            <span class="chart-value">{{ item.value }}</span>
          </div>
        </div>
        <div v-else class="chart-placeholder">No data yet</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '../lib/api'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const currentMonth = ref(new Date().toISOString().slice(0, 7))
const summary = ref({
  month: currentMonth.value,
  monthLabel: '-',
  totals: { Returned: 0, Pending: 0, Cancelled: 0, 'Double Waybill': 0, Outbound: 0 },
  chart: [],
  unresolvedReports: [],
  recentHistory: [],
})

const stats = computed(() => [
  { label: 'Returned', value: summary.value.totals.Returned ?? 0 },
  { label: 'Pending', value: summary.value.totals.Pending ?? 0 },
  { label: 'Cancelled', value: summary.value.totals.Cancelled ?? 0 },
  { label: 'Double Waybill', value: summary.value.totals['Double Waybill'] ?? 0 },
  { label: 'Outbound', value: summary.value.totals.Outbound ?? 0 },
])

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function truncate(value, maxLength) {
  if (!value) return '-'
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function historyClass(action) {
  if (/resolved|outbound|created|added/i.test(action)) return 'success'
  if (/cancelled|inactive|error/i.test(action)) return 'warning'
  return ''
}

function chartWidth(value) {
  const maxValue = Math.max(...summary.value.chart.map(item => item.value), 1)
  return (value / maxValue) * 100
}

async function loadSummary() {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await apiRequest('/dashboard/summary', { params: { month: currentMonth.value } })
    summary.value = data
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

function shiftMonth(offset) {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1 + offset, 1))
  currentMonth.value = nextDate.toISOString().slice(0, 7)
  loadSummary()
}

function goToPreviousMonth() { shiftMonth(-1) }
function goToNextMonth() { shiftMonth(1) }

onMounted(() => {
  loadSummary()
})
</script>

<style scoped>
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: #000000; font-size: 14px; }
.topbar-right { display: flex; align-items: center; gap: 10px; color: #000000; }
.icon-btn { border: none; background: #fff; padding: 6px 10px; cursor: pointer; border-radius: 4px; }
.page-message { margin-bottom: 14px; font-size: 13px; }
.page-message.error { color: #a32900; }
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 8px; padding: 15px; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.stat-card p { font-size: 14px; color: #777; }
.stat-card h2 { margin-top: 8px; font-size: 28px; }
.card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.1); color: #000000; }
.card h3 { margin-bottom: 15px; }
.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee; }
.date-right { margin-left: auto; color: #777; font-size: 13px; }
.error { color: red; }
.history-row { padding: 10px 0; border-bottom: 1px solid #eee; }
.success { color: green; }
.warning { color: #d9534f; }
.link { display: inline-block; margin-top: 12px; color: #1a73e8; cursor: pointer; font-size: 14px; background: none; border: none; padding: 0; }
.bottom { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.empty-state, .chart-placeholder { color: #999; padding: 12px 0; }
.chart-bars { display: flex; flex-direction: column; gap: 12px; }
.chart-row { display: grid; grid-template-columns: 110px 1fr 32px; gap: 10px; align-items: center; }
.chart-label, .chart-value { font-size: 13px; }
.chart-track { height: 12px; background: #f1f1f1; border-radius: 999px; overflow: hidden; }
.chart-fill { height: 100%; background: linear-gradient(90deg, #ff6b00, #ffb067); border-radius: 999px; }
</style>
