'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { listSchedules, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, cronToHuman } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
  HiOutlinePlayCircle,
  HiOutlinePauseCircle,
  HiOutlineArrowTrendingUp,
  HiOutlineBellAlert,
  HiOutlineInformationCircle,
  HiOutlineLink
} from 'react-icons/hi2'
import { FiActivity, FiExternalLink } from 'react-icons/fi'
import { BiSort, BiSortUp, BiSortDown } from 'react-icons/bi'

// ─── Theme ───────────────────────────────────────────────────────────────────

const THEME_VARS = {
  '--background': '220 15% 97%',
  '--foreground': '220 15% 10%',
  '--card': '0 0% 100%',
  '--card-foreground': '220 15% 10%',
  '--primary': '220 75% 50%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 15% 92%',
  '--secondary-foreground': '220 15% 20%',
  '--muted': '220 15% 92%',
  '--muted-foreground': '220 12% 50%',
  '--accent': '160 65% 40%',
  '--accent-foreground': '0 0% 100%',
  '--destructive': '0 70% 50%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '220 15% 88%',
  '--input': '220 15% 88%',
  '--ring': '220 75% 50%',
  '--radius': '0.125rem',
} as React.CSSProperties

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Attendee {
  name: string
  email: string
  role: string
  company?: string
}

interface EnrichedCall {
  call_id: string
  company_name: string
  call_datetime_ist: string
  call_date: string
  call_time: string
  original_timezone: string
  local_time: string
  attendees: Attendee[]
  meeting_platform: string
  meeting_link: string
  ai_notes: string
  key_topics: string[]
  action_items: string[]
  email_thread_summary: string
  company_size_tier: string
  employee_count: string
  estimated_revenue: string
  industry: string
  priority: string
  headquarters: string
  company_website: string
  is_new: boolean
  enrichment_confidence: number
}

interface CallSummary {
  total_calls: number
  new_calls: number
  high_priority: number
  medium_priority: number
  low_priority: number
  todays_calls: number
  pipeline_status: string
}

// ─── Agent constants ─────────────────────────────────────────────────────────

const AGENTS = {
  EMAIL_SCANNER: { id: '6998587fe5f0636eb7056506', name: 'Email Scanner Agent', desc: 'Scans Gmail for demo call emails' },
  DATA_EXTRACTION: { id: '6998587f92ed7d63ef1029c0', name: 'Data Extraction Agent', desc: 'Parses emails into structured records' },
  COMPANY_RESEARCH: { id: '6998587f287fc1efe03967c9', name: 'Company Research Agent', desc: 'Researches companies via Perplexity' },
  ENRICHMENT_COORDINATOR: { id: '699858aa9cb8e41088ffb070', name: 'Enrichment Coordinator', desc: 'Coordinates enrichment of call data' },
  MORNING_DIGEST: { id: '699858ab7663cf0f495cfd32', name: 'Morning Digest Agent', desc: 'Compiles and sends daily digest email' },
}

const SCHEDULE_IDS = {
  EMAIL_SCANNER: '69985dc3399dfadeac37cc66',
  MORNING_DIGEST: '699858b8399dfadeac37cbe7',
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_CALLS: EnrichedCall[] = [
  {
    call_id: 'call_001',
    company_name: 'TechVision AI',
    call_datetime_ist: '2026-02-21T10:00:00+05:30',
    call_date: '2026-02-21',
    call_time: '10:00 IST',
    original_timezone: 'America/New_York',
    local_time: '11:30 PM EST',
    attendees: [
      { name: 'Sarah Chen', email: 'sarah@techvision.ai', role: 'CTO' },
      { name: 'Mike Ross', email: 'mike@techvision.ai', role: 'VP Engineering' },
    ],
    meeting_platform: 'Google Meet',
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    ai_notes: 'TechVision AI is exploring Lyzr GPT for internal knowledge management and customer-facing chatbots. They have a team of 50+ engineers and are looking for enterprise-grade AI solutions. High interest in RAG capabilities and custom model training.',
    key_topics: ['knowledge management', 'RAG', 'enterprise AI', 'custom training'],
    action_items: ['Prepare enterprise pricing', 'Share RAG documentation', 'Schedule technical deep-dive'],
    email_thread_summary: 'Initial outreach via LinkedIn. Sarah expressed strong interest after seeing our latest product demo at AI Summit 2026.',
    company_size_tier: 'Enterprise',
    employee_count: '1000-5000',
    estimated_revenue: '$150M',
    industry: 'Artificial Intelligence',
    priority: 'High',
    headquarters: 'San Francisco, CA',
    company_website: 'https://techvision.ai',
    is_new: true,
    enrichment_confidence: 92,
  },
  {
    call_id: 'call_002',
    company_name: 'HealthPulse Inc',
    call_datetime_ist: '2026-02-21T14:30:00+05:30',
    call_date: '2026-02-21',
    call_time: '14:30 IST',
    original_timezone: 'Europe/London',
    local_time: '09:00 AM GMT',
    attendees: [
      { name: 'Dr. Emily Watson', email: 'emily@healthpulse.io', role: 'CEO' },
    ],
    meeting_platform: 'Zoom',
    meeting_link: 'https://zoom.us/j/987654321',
    ai_notes: 'HealthPulse is a digital health startup interested in using Lyzr GPT for patient triage chatbots and clinical decision support. Compliance with HIPAA is a major concern.',
    key_topics: ['healthcare AI', 'HIPAA compliance', 'patient triage', 'clinical support'],
    action_items: ['Prepare HIPAA compliance docs', 'Demo healthcare use case'],
    email_thread_summary: 'Cold outreach email. Emily responded after reviewing our healthcare case studies.',
    company_size_tier: 'Mid-Market',
    employee_count: '200-500',
    estimated_revenue: '$40M',
    industry: 'Healthcare Technology',
    priority: 'Medium',
    headquarters: 'London, UK',
    company_website: 'https://healthpulse.io',
    is_new: true,
    enrichment_confidence: 78,
  },
  {
    call_id: 'call_003',
    company_name: 'RetailFlow',
    call_datetime_ist: '2026-02-22T11:00:00+05:30',
    call_date: '2026-02-22',
    call_time: '11:00 IST',
    original_timezone: 'Asia/Singapore',
    local_time: '01:30 PM SGT',
    attendees: [
      { name: 'James Tan', email: 'james@retailflow.com', role: 'Product Manager' },
      { name: 'Lisa Ng', email: 'lisa@retailflow.com', role: 'Data Scientist' },
      { name: 'David Kim', email: 'david@retailflow.com', role: 'Engineering Lead' },
    ],
    meeting_platform: 'Microsoft Teams',
    meeting_link: 'https://teams.microsoft.com/l/meetup/abc123',
    ai_notes: 'RetailFlow is a regional e-commerce platform looking to integrate AI-powered product recommendations and customer support automation.',
    key_topics: ['e-commerce', 'product recommendations', 'customer support', 'automation'],
    action_items: ['Send API integration guide', 'Prepare e-commerce demo'],
    email_thread_summary: 'Referral from existing customer. Multiple follow-up emails about pricing and integration timeline.',
    company_size_tier: 'SMB',
    employee_count: '50-200',
    estimated_revenue: '$10M',
    industry: 'E-commerce',
    priority: 'Low',
    headquarters: 'Singapore',
    company_website: 'https://retailflow.com',
    is_new: false,
    enrichment_confidence: 65,
  },
  {
    call_id: 'call_004',
    company_name: 'FinanceEdge Global',
    call_datetime_ist: '2026-02-20T16:00:00+05:30',
    call_date: '2026-02-20',
    call_time: '16:00 IST',
    original_timezone: 'America/Chicago',
    local_time: '05:30 AM CST',
    attendees: [
      { name: 'Robert Miller', email: 'robert@financeedge.com', role: 'Head of Innovation' },
      { name: 'Anna Kowalski', email: 'anna@financeedge.com', role: 'AI Strategy Lead' },
    ],
    meeting_platform: 'Zoom',
    meeting_link: 'https://zoom.us/j/111222333',
    ai_notes: 'FinanceEdge is a large financial services firm exploring AI for fraud detection, risk assessment, and automated compliance reporting. Very high budget potential.',
    key_topics: ['fraud detection', 'risk assessment', 'compliance', 'financial AI'],
    action_items: ['Prepare security whitepaper', 'Set up sandbox environment', 'Connect with legal team'],
    email_thread_summary: 'Enterprise inquiry through website contact form. Multiple stakeholders involved in decision.',
    company_size_tier: 'Enterprise',
    employee_count: '5000+',
    estimated_revenue: '$500M+',
    industry: 'Financial Services',
    priority: 'High',
    headquarters: 'Chicago, IL',
    company_website: 'https://financeedge.com',
    is_new: false,
    enrichment_confidence: 88,
  },
  {
    call_id: 'call_005',
    company_name: 'EduSpark',
    call_datetime_ist: '2026-02-20T09:30:00+05:30',
    call_date: '2026-02-20',
    call_time: '09:30 IST',
    original_timezone: 'Asia/Kolkata',
    local_time: '09:30 AM IST',
    attendees: [
      { name: 'Priya Sharma', email: 'priya@eduspark.in', role: 'Founder' },
    ],
    meeting_platform: 'Google Meet',
    meeting_link: 'https://meet.google.com/xyz-uvwx-rst',
    ai_notes: 'EduSpark is an edtech startup building personalized learning platforms. Interested in Lyzr GPT for adaptive tutoring and content generation.',
    key_topics: ['edtech', 'adaptive learning', 'content generation', 'tutoring'],
    action_items: ['Share edtech case studies', 'Provide startup pricing'],
    email_thread_summary: 'Direct outreach from founder after attending a webinar.',
    company_size_tier: 'Startup',
    employee_count: '10-50',
    estimated_revenue: '$2M',
    industry: 'Education Technology',
    priority: 'Medium',
    headquarters: 'Bangalore, India',
    company_website: 'https://eduspark.in',
    is_new: true,
    enrichment_confidence: 70,
  },
]

const SAMPLE_SUMMARY: CallSummary = {
  total_calls: 5,
  new_calls: 3,
  high_priority: 2,
  medium_priority: 2,
  low_priority: 1,
  todays_calls: 2,
  pipeline_status: 'Healthy',
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm leading-snug">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm leading-snug">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        return <p key={i} className="text-sm leading-snug">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ─── Helper: Priority Badge ─────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high') return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-medium hover:bg-red-100">High</Badge>
  if (p === 'medium') return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs font-medium hover:bg-orange-100">Medium</Badge>
  return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium hover:bg-green-100">Low</Badge>
}

// ─── Helper: Status Dot ─────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
  )
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({ call, onClose }: { call: EnrichedCall; onClose: () => void }) {
  const attendees = Array.isArray(call?.attendees) ? call.attendees : []
  const topics = Array.isArray(call?.key_topics) ? call.key_topics : []
  const actions = Array.isArray(call?.action_items) ? call.action_items : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-card z-10 px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineBuildingOffice2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{call?.company_name ?? 'Unknown'}</h2>
            <PriorityBadge priority={call?.priority ?? 'low'} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><HiOutlineXMark className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Company Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{call?.industry ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Size Tier:</span> <span className="font-medium">{call?.company_size_tier ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{call?.employee_count ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Revenue:</span> <span className="font-medium">{call?.estimated_revenue ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">HQ:</span> <span className="font-medium">{call?.headquarters ?? 'N/A'}</span></div>
              <div>
                <span className="text-muted-foreground">Website:</span>{' '}
                {call?.company_website ? (
                  <a href={call.company_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium">
                    Visit <FiExternalLink className="w-3 h-3" />
                  </a>
                ) : <span>N/A</span>}
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Call Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{call?.call_date ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Time (IST):</span> <span className="font-medium">{call?.call_time ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Local Time:</span> <span className="font-medium">{call?.local_time ?? 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Platform:</span> <span className="font-medium">{call?.meeting_platform ?? 'N/A'}</span></div>
            </div>
            {call?.meeting_link && (
              <a href={call.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <HiOutlineLink className="w-4 h-4" /> Join Meeting
              </a>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Attendees ({attendees.length})</h3>
            <div className="space-y-2">
              {attendees.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {(a?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{a?.name ?? 'Unknown'}</div>
                    <div className="text-muted-foreground text-xs">{a?.email ?? ''} {a?.role ? `(${a.role})` : ''}</div>
                  </div>
                </div>
              ))}
              {attendees.length === 0 && <p className="text-sm text-muted-foreground">No attendees listed</p>}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">AI Notes</h3>
            <div className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded">
              {renderMarkdown(call?.ai_notes ?? 'No notes available.')}
            </div>
          </section>

          {topics.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Key Topics</h3>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </section>
          )}

          {actions.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Action Items</h3>
              <ul className="space-y-1">
                {actions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <HiOutlineChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {call?.email_thread_summary && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Email Thread Summary</h3>
              <p className="text-sm text-foreground bg-muted/30 p-3 rounded">{call.email_thread_summary}</p>
            </section>
          )}

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Enrichment Confidence</h3>
            <div className="flex items-center gap-3">
              <Progress value={call?.enrichment_confidence ?? 0} className="flex-1 h-2" />
              <span className="text-sm font-medium">{call?.enrichment_confidence ?? 0}%</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── Schedule Card ───────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  logs,
  logsLoading,
  onToggle,
  onTrigger,
  onLoadLogs,
  actionStatus,
}: {
  schedule: Schedule
  logs: ExecutionLog[]
  logsLoading: boolean
  onToggle: () => void
  onTrigger: () => void
  onLoadLogs: () => void
  actionStatus: string
}) {
  const [logsOpen, setLogsOpen] = useState(false)

  const schedName =
    schedule?.agent_id === AGENTS.EMAIL_SCANNER.id
      ? 'Email Scanner (Hourly)'
      : schedule?.agent_id === AGENTS.MORNING_DIGEST.id
        ? 'Morning Digest (Daily 8AM)'
        : (schedule?.message ?? 'Schedule').slice(0, 40)

  return (
    <Card className="border-border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot active={schedule?.is_active ?? false} />
            <CardTitle className="text-sm font-medium">{schedName}</CardTitle>
          </div>
          <Badge variant={schedule?.is_active ? 'default' : 'secondary'} className="text-xs">
            {schedule?.is_active ? 'Active' : 'Paused'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Schedule:</span>
            <p className="font-medium">{schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Timezone:</span>
            <p className="font-medium">{schedule?.timezone ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Next Run:</span>
            <p className="font-medium">{schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Run:</span>
            <p className="font-medium">{schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={schedule?.is_active ? 'outline' : 'default'}
            className="text-xs h-7 flex-1"
            onClick={onToggle}
          >
            {schedule?.is_active ? (
              <><HiOutlinePauseCircle className="w-3.5 h-3.5 mr-1" /> Pause</>
            ) : (
              <><HiOutlinePlayCircle className="w-3.5 h-3.5 mr-1" /> Resume</>
            )}
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={onTrigger}>
            <HiOutlineArrowPath className="w-3.5 h-3.5 mr-1" /> Run Now
          </Button>
        </div>

        {actionStatus && (
          <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">{actionStatus}</p>
        )}

        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 w-full justify-between px-1"
              onClick={() => { if (!logsOpen) onLoadLogs() }}
            >
              <span>Recent Executions</span>
              {logsOpen ? <HiOutlineChevronUp className="w-3.5 h-3.5" /> : <HiOutlineChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1">
              {logsLoading && <p className="text-xs text-muted-foreground">Loading logs...</p>}
              {!logsLoading && logs.length === 0 && <p className="text-xs text-muted-foreground">No execution logs yet.</p>}
              {logs.map((log, i) => (
                <div key={log?.id ?? i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    {log?.success ? <HiOutlineCheck className="w-3.5 h-3.5 text-green-600" /> : <HiOutlineXMark className="w-3.5 h-3.5 text-red-500" />}
                    <span className={log?.success ? 'text-green-700' : 'text-red-600'}>{log?.success ? 'Success' : 'Failed'}</span>
                  </div>
                  <span className="text-muted-foreground">{log?.executed_at ? new Date(log.executed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Page ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function Page() {
  // ─── Core State ──────────────────────────────────────────────────────────
  const [demoCalls, setDemoCalls] = useState<EnrichedCall[]>([])
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSendingDigest, setIsSendingDigest] = useState(false)
  const [lastScanTime, setLastScanTime] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState('')
  const [selectedCall, setSelectedCall] = useState<EnrichedCall | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'priority', direction: 'desc' })
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Schedules
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [executionLogs, setExecutionLogs] = useState<Record<string, ExecutionLog[]>>({})
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState<Record<string, boolean>>({})
  const [scheduleActionStatus, setScheduleActionStatus] = useState<Record<string, string>>({})

  // Digest
  const [digestEmail, setDigestEmail] = useState('')
  const [digestStatus, setDigestStatus] = useState('')

  // Tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Countdown
  const [countdown, setCountdown] = useState(3600)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 3600
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  const formatCountdown = useCallback((secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }, [])

  // ─── Load schedules on mount ──────────────────────────────────────────────
  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    setSchedulesLoading(true)
    const result = await listSchedules()
    if (result.success) {
      setSchedules(result.schedules)
    }
    setSchedulesLoading(false)
  }

  const loadLogs = async (scheduleId: string) => {
    setLogsLoading(prev => ({ ...prev, [scheduleId]: true }))
    const result = await getScheduleLogs(scheduleId, { limit: 5 })
    if (result.success) {
      setExecutionLogs(prev => ({ ...prev, [scheduleId]: result.executions }))
    }
    setLogsLoading(prev => ({ ...prev, [scheduleId]: false }))
  }

  const handleToggleSchedule = async (schedule: Schedule) => {
    const action = schedule.is_active ? 'Pausing' : 'Resuming'
    setScheduleActionStatus(prev => ({ ...prev, [schedule.id]: `${action}...` }))
    const result = schedule.is_active
      ? await pauseSchedule(schedule.id)
      : await resumeSchedule(schedule.id)
    if (result.success) {
      setScheduleActionStatus(prev => ({ ...prev, [schedule.id]: `${schedule.is_active ? 'Paused' : 'Resumed'} successfully.` }))
    } else {
      setScheduleActionStatus(prev => ({ ...prev, [schedule.id]: `Error: ${result.error ?? 'Unknown'}` }))
    }
    await loadSchedules()
    setTimeout(() => setScheduleActionStatus(prev => ({ ...prev, [schedule.id]: '' })), 3000)
  }

  const handleTriggerSchedule = async (scheduleId: string) => {
    setScheduleActionStatus(prev => ({ ...prev, [scheduleId]: 'Triggering...' }))
    const result = await triggerScheduleNow(scheduleId)
    if (result.success) {
      setScheduleActionStatus(prev => ({ ...prev, [scheduleId]: 'Triggered successfully!' }))
    } else {
      setScheduleActionStatus(prev => ({ ...prev, [scheduleId]: `Error: ${result.error ?? 'Unknown'}` }))
    }
    setTimeout(() => setScheduleActionStatus(prev => ({ ...prev, [scheduleId]: '' })), 3000)
  }

  // ─── Scan Now ──────────────────────────────────────────────────────────────
  // Helper: deeply search an object for a key, returns first match
  const deepFind = (obj: any, key: string): any => {
    if (!obj || typeof obj !== 'object') return undefined
    if (key in obj) return obj[key]
    for (const k of Object.keys(obj)) {
      const found = deepFind(obj[k], key)
      if (found !== undefined) return found
    }
    return undefined
  }

  // Helper: map raw scanner call to enriched call shape
  const mapScannerToEnriched = (dc: any, idx: number): EnrichedCall => ({
    call_id: String(dc?.email_id ?? dc?.call_id ?? `call_${idx}`),
    company_name: String(dc?.company_name ?? 'Unknown'),
    call_datetime_ist: String(dc?.call_datetime_ist ?? ''),
    call_date: String(dc?.call_date ?? (dc?.call_datetime_ist ?? '').slice(0, 10)),
    call_time: String(dc?.call_time ?? (dc?.call_datetime_ist ?? '').slice(11, 16) + ' IST'),
    original_timezone: String(dc?.original_timezone ?? ''),
    local_time: String(dc?.local_time ?? dc?.original_timezone ?? ''),
    attendees: Array.isArray(dc?.attendees) ? dc.attendees : [],
    meeting_platform: String(dc?.meeting_platform ?? ''),
    meeting_link: String(dc?.meeting_link ?? ''),
    ai_notes: String(dc?.ai_notes ?? ''),
    key_topics: Array.isArray(dc?.key_topics) ? dc.key_topics : [],
    action_items: Array.isArray(dc?.action_items) ? dc.action_items : [],
    email_thread_summary: String(dc?.email_thread_summary ?? dc?.email_subject ?? ''),
    company_size_tier: String(dc?.company_size_tier ?? 'Unknown'),
    employee_count: String(dc?.employee_count ?? 'Unknown'),
    estimated_revenue: String(dc?.estimated_revenue ?? 'Unknown'),
    industry: String(dc?.industry ?? 'Unknown'),
    priority: String(dc?.priority ?? 'Medium'),
    headquarters: String(dc?.headquarters ?? ''),
    company_website: String(dc?.company_website ?? ''),
    is_new: Boolean(dc?.is_new ?? true),
    enrichment_confidence: Number(dc?.enrichment_confidence ?? 50),
  })

  const handleScanNow = async () => {
    setIsScanning(true)
    setScanStatus('Scanning Gmail for Lyzr GPT / LyzrGPT / Lizer GPT emails...')
    setActiveAgentId(AGENTS.EMAIL_SCANNER.id)

    try {
      const scanResult = await callAIAgent(
        'Use the GMAIL_FETCH_EMAILS tool to fetch emails with query "Lyzr GPT OR LyzrGPT OR Lizer GPT" and max_results 50. If 0 results, retry with query "lyzr" and max_results 50. Scan all fetched emails for demo call mentions. Extract company name, meeting time, attendees, calendar info, meeting links, and generate contextual notes for each match.',
        AGENTS.EMAIL_SCANNER.id
      )

      console.log('[DemoTracker] Scan result:', JSON.stringify(scanResult).slice(0, 500))

      if (!scanResult.success) {
        setScanStatus('Scan failed: ' + (scanResult.error ?? 'Unknown error'))
        setIsScanning(false)
        setActiveAgentId(null)
        return
      }

      // Deep-search the entire response for demo_calls array
      const responseObj = scanResult?.response?.result ?? scanResult?.response ?? scanResult
      const foundDemoCalls = deepFind(responseObj, 'demo_calls')
      const scannerCalls: any[] = Array.isArray(foundDemoCalls) ? foundDemoCalls : []

      // Also try to find emails_found count
      const foundEmailCount = deepFind(responseObj, 'emails_found')
      const emailsFound = typeof foundEmailCount === 'number' ? foundEmailCount : scannerCalls.length

      console.log('[DemoTracker] Parsed:', { emailsFound, scannerCallsCount: scannerCalls.length })

      if (emailsFound === 0 && scannerCalls.length === 0) {
        setScanStatus('Scan complete: No matching emails found in Gmail. Ensure your Gmail has emails containing "Lyzr GPT", "LyzrGPT", or "Lizer GPT".')
        setLastScanTime(new Date().toISOString())
        setCountdown(3600)
        setIsScanning(false)
        setActiveAgentId(null)
        return
      }

      setScanStatus(`Found ${emailsFound} emails. Enriching with company data...`)
      setActiveAgentId(AGENTS.ENRICHMENT_COORDINATOR.id)

      const enrichResult = await callAIAgent(
        JSON.stringify({
          task: 'Enrich the following email scan data with structured call records and company research. For each call, provide: call_id, company_name, call_datetime_ist, call_date, call_time, original_timezone, local_time, attendees, meeting_platform, meeting_link, ai_notes, key_topics, action_items, email_thread_summary, company_size_tier, employee_count, estimated_revenue, industry, priority (High/Medium/Low), headquarters, company_website, is_new, enrichment_confidence.',
          scan_data: responseObj,
        }),
        AGENTS.ENRICHMENT_COORDINATOR.id
      )

      console.log('[DemoTracker] Enrichment result:', JSON.stringify(enrichResult).slice(0, 500))

      if (enrichResult.success) {
        const enrichedObj = enrichResult?.response?.result ?? enrichResult?.response ?? enrichResult
        const foundEnrichedCalls = deepFind(enrichedObj, 'enriched_calls')
        let calls: EnrichedCall[] = Array.isArray(foundEnrichedCalls)
          ? foundEnrichedCalls.map((c: any, i: number) => mapScannerToEnriched(c, i))
          : []

        // Fallback: if enrichment gave nothing but scanner had calls
        if (calls.length === 0 && scannerCalls.length > 0) {
          calls = scannerCalls.map((dc: any, idx: number) => mapScannerToEnriched(dc, idx))
        }

        setDemoCalls(calls)
        const foundSummary = deepFind(enrichedObj, 'summary')
        if (foundSummary && typeof foundSummary === 'object') setCallSummary(foundSummary)
        setLastScanTime(new Date().toISOString())
        setCountdown(3600)
        setScanStatus(`Scan complete: ${calls.length} demo calls found and enriched.`)
      } else {
        // Enrichment failed - use scanner data as fallback
        if (scannerCalls.length > 0) {
          const fallbackCalls = scannerCalls.map((dc: any, idx: number) => mapScannerToEnriched(dc, idx))
          setDemoCalls(fallbackCalls)
          setLastScanTime(new Date().toISOString())
          setCountdown(3600)
          setScanStatus(`Scan complete: ${fallbackCalls.length} calls found (showing basic data).`)
        } else {
          setScanStatus('Enrichment failed: ' + (enrichResult.error ?? 'Unknown error'))
        }
      }
    } catch (err) {
      setScanStatus('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }

    setIsScanning(false)
    setActiveAgentId(null)
  }

  // ─── Send Digest ──────────────────────────────────────────────────────────
  const handleSendDigest = async () => {
    setIsSendingDigest(true)
    setDigestStatus('Compiling and sending morning digest...')
    setActiveAgentId(AGENTS.MORNING_DIGEST.id)

    try {
      const currentCalls = showSampleData && demoCalls.length === 0 ? SAMPLE_CALLS : demoCalls
      const result = await callAIAgent(
        JSON.stringify({
          task: 'Compile all demo calls and send a formatted summary email digest',
          recipient: digestEmail || 'default',
          calls_data: currentCalls,
          send_to: digestEmail,
        }),
        AGENTS.MORNING_DIGEST.id
      )

      if (result.success) {
        const digestData = result?.response?.result
        setDigestStatus(digestData?.email_sent ? 'Digest sent successfully!' : 'Digest compiled but email sending status unknown.')
      } else {
        setDigestStatus('Failed to send digest: ' + (result.error ?? 'Unknown error'))
      }
    } catch (err) {
      setDigestStatus('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }

    setIsSendingDigest(false)
    setActiveAgentId(null)
  }

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const activeCalls = useMemo(() => {
    if (showSampleData && demoCalls.length === 0) return SAMPLE_CALLS
    return demoCalls
  }, [showSampleData, demoCalls])

  const activeSummary = useMemo((): CallSummary => {
    if (callSummary) return callSummary
    if (showSampleData && demoCalls.length === 0) return SAMPLE_SUMMARY
    const calls = demoCalls
    return {
      total_calls: calls.length,
      new_calls: calls.filter(c => c?.is_new).length,
      high_priority: calls.filter(c => (c?.priority ?? '').toLowerCase() === 'high').length,
      medium_priority: calls.filter(c => (c?.priority ?? '').toLowerCase() === 'medium').length,
      low_priority: calls.filter(c => (c?.priority ?? '').toLowerCase() === 'low').length,
      todays_calls: calls.filter(c => {
        try { return c?.call_date === new Date().toISOString().slice(0, 10) } catch { return false }
      }).length,
      pipeline_status: 'Active',
    }
  }, [callSummary, showSampleData, demoCalls])

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredCalls = useMemo(() => {
    let result = [...activeCalls]
    if (priorityFilter.length > 0) {
      result = result.filter(c => priorityFilter.includes((c?.priority ?? '').toLowerCase()))
    }
    if (companySearch.trim()) {
      const q = companySearch.toLowerCase()
      result = result.filter(c => (c?.company_name ?? '').toLowerCase().includes(q))
    }
    if (dateFrom) {
      result = result.filter(c => (c?.call_date ?? '') >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(c => (c?.call_date ?? '') <= dateTo)
    }
    return result
  }, [activeCalls, priorityFilter, companySearch, dateFrom, dateTo])

  // ─── Sorting ───────────────────────────────────────────────────────────────
  const sortedCalls = useMemo(() => {
    const sorted = [...filteredCalls]
    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 }

    sorted.sort((a, b) => {
      const key = sortConfig.key
      let aVal: string | number = ''
      let bVal: string | number = ''

      if (key === 'priority') {
        aVal = priorityWeight[(a?.priority ?? '').toLowerCase()] ?? 0
        bVal = priorityWeight[(b?.priority ?? '').toLowerCase()] ?? 0
      } else if (key === 'company_name') {
        aVal = (a?.company_name ?? '').toLowerCase()
        bVal = (b?.company_name ?? '').toLowerCase()
      } else if (key === 'call_datetime_ist') {
        aVal = a?.call_datetime_ist ?? ''
        bVal = b?.call_datetime_ist ?? ''
      } else if (key === 'attendees') {
        aVal = Array.isArray(a?.attendees) ? a.attendees.length : 0
        bVal = Array.isArray(b?.attendees) ? b.attendees.length : 0
      } else if (key === 'employee_count') {
        aVal = a?.employee_count ?? ''
        bVal = b?.employee_count ?? ''
      } else if (key === 'estimated_revenue') {
        aVal = a?.estimated_revenue ?? ''
        bVal = b?.estimated_revenue ?? ''
      } else {
        aVal = ((a as Record<string, unknown>)?.[key] as string) ?? ''
        bVal = ((b as Record<string, unknown>)?.[key] as string) ?? ''
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredCalls, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  function SortIcon({ column }: { column: string }) {
    if (sortConfig.key !== column) return <BiSort className="w-3.5 h-3.5 text-muted-foreground/50" />
    return sortConfig.direction === 'asc'
      ? <BiSortUp className="w-3.5 h-3.5 text-primary" />
      : <BiSortDown className="w-3.5 h-3.5 text-primary" />
  }

  const clearFilters = () => {
    setPriorityFilter([])
    setCompanySearch('')
    setDateFrom('')
    setDateTo('')
  }

  const togglePriority = (p: string) => {
    setPriorityFilter(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  // ─── Relevant schedules ───────────────────────────────────────────────────
  const relevantSchedules = useMemo(() => {
    const ids = [SCHEDULE_IDS.EMAIL_SCANNER, SCHEDULE_IDS.MORNING_DIGEST]
    return schedules.filter(s => ids.includes(s?.id))
  }, [schedules])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-background text-foreground font-sans">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-[1440px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">Lyzr GPT Demo Tracker</h1>
              <p className="text-xs text-muted-foreground">Real-time Email Intelligence Dashboard</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
              </div>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HiOutlineClock className="w-3.5 h-3.5" />
                {lastScanTime ? (
                  <span>Last: {new Date(lastScanTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                ) : (
                  <span>No scan yet</span>
                )}
                <span className="text-muted-foreground/60">|</span>
                <span>Next: {formatCountdown(countdown)}</span>
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={handleScanNow} disabled={isScanning}>
                {isScanning ? <HiOutlineArrowPath className="w-3.5 h-3.5 mr-1 animate-spin" /> : <HiOutlineMagnifyingGlass className="w-3.5 h-3.5 mr-1" />}
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSendDigest} disabled={isSendingDigest}>
                {isSendingDigest ? <HiOutlineArrowPath className="w-3.5 h-3.5 mr-1 animate-spin" /> : <HiOutlineEnvelope className="w-3.5 h-3.5 mr-1" />}
                {isSendingDigest ? 'Sending...' : 'Send Digest'}
              </Button>
            </div>
          </div>
          {scanStatus && (
            <div className="bg-muted/50 border-t border-border px-4 py-1.5">
              <div className="max-w-[1440px] mx-auto flex items-center gap-2 text-xs">
                {isScanning && <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin text-primary" />}
                {!isScanning && scanStatus.includes('complete') && <HiOutlineCheck className="w-3.5 h-3.5 text-green-600" />}
                {!isScanning && (scanStatus.includes('failed') || scanStatus.includes('Error')) && <HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-red-500" />}
                <span className="text-muted-foreground">{scanStatus}</span>
              </div>
            </div>
          )}
        </header>

        <main className="max-w-[1440px] mx-auto px-4 py-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-8">
              <TabsTrigger value="dashboard" className="text-xs h-7 px-3">
                <FiActivity className="w-3.5 h-3.5 mr-1" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="schedules" className="text-xs h-7 px-3">
                <HiOutlineCalendarDays className="w-3.5 h-3.5 mr-1" /> Schedules
              </TabsTrigger>
              <TabsTrigger value="digest" className="text-xs h-7 px-3">
                <HiOutlineEnvelope className="w-3.5 h-3.5 mr-1" /> Morning Digest
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4 mt-3">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold leading-none">{activeSummary.total_calls}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Tracked</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <HiOutlineCalendarDays className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold leading-none">{activeSummary.todays_calls}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s Calls</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                      <HiOutlineBellAlert className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold leading-none">{activeSummary.high_priority}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">High Priority</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-green-50 flex items-center justify-center flex-shrink-0">
                      <HiOutlineArrowTrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold leading-none">{activeSummary.new_calls}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">New (24h)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="border-border">
                <CardContent className="p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Priority:</span>
                      {['high', 'medium', 'low'].map(p => (
                        <label key={p} className="flex items-center gap-1 cursor-pointer">
                          <Checkbox
                            checked={priorityFilter.includes(p)}
                            onCheckedChange={() => togglePriority(p)}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs capitalize">{p}</span>
                        </label>
                      ))}
                    </div>
                    <Separator orientation="vertical" className="h-5 hidden md:block" />
                    <div className="flex items-center gap-1.5">
                      <HiOutlineMagnifyingGlass className="w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search company..."
                        value={companySearch}
                        onChange={e => setCompanySearch(e.target.value)}
                        className="h-7 text-xs w-40"
                      />
                    </div>
                    <Separator orientation="vertical" className="h-5 hidden md:block" />
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs w-32" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs w-32" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                      <HiOutlineXMark className="w-3.5 h-3.5 mr-0.5" /> Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('company_name')}>
                          <span className="flex items-center gap-1">Company <SortIcon column="company_name" /></span>
                        </TableHead>
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('call_datetime_ist')}>
                          <span className="flex items-center gap-1">Date/Time (IST) <SortIcon column="call_datetime_ist" /></span>
                        </TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Local Time</TableHead>
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('attendees')}>
                          <span className="flex items-center gap-1">Attendees <SortIcon column="attendees" /></span>
                        </TableHead>
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('priority')}>
                          <span className="flex items-center gap-1">Priority <SortIcon column="priority" /></span>
                        </TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Size Tier</TableHead>
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('employee_count')}>
                          <span className="flex items-center gap-1">Employees <SortIcon column="employee_count" /></span>
                        </TableHead>
                        <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('estimated_revenue')}>
                          <span className="flex items-center gap-1">Revenue <SortIcon column="estimated_revenue" /></span>
                        </TableHead>
                        <TableHead className="text-xs whitespace-nowrap">AI Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCalls.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="text-muted-foreground">
                              <HiOutlineDocumentText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="text-sm font-medium">No demo calls tracked yet.</p>
                              <p className="text-xs mt-1">Click &quot;Scan Now&quot; to begin scanning Gmail for demo call emails.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {sortedCalls.map((call, idx) => {
                        const isHigh = (call?.priority ?? '').toLowerCase() === 'high'
                        const attendeeCount = Array.isArray(call?.attendees) ? call.attendees.length : 0
                        const notesText = call?.ai_notes ?? ''
                        const notesPreview = notesText.length > 55 ? notesText.slice(0, 55) + '...' : notesText
                        return (
                          <TableRow
                            key={call?.call_id ?? idx}
                            className={`cursor-pointer transition-colors ${isHigh ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-muted/50'}`}
                            onClick={() => setSelectedCall(call)}
                          >
                            <TableCell className="text-sm font-medium py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {call?.company_name ?? 'Unknown'}
                                {call?.is_new && <Badge className="text-[10px] h-4 px-1 bg-blue-500 text-white border-blue-500 hover:bg-blue-500">New</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">
                              <div>
                                <div>{call?.call_date ?? 'N/A'}</div>
                                <div className="text-muted-foreground">{call?.call_time ?? ''}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground whitespace-nowrap">{call?.local_time ?? 'N/A'}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="secondary" className="text-xs">{attendeeCount}</Badge>
                            </TableCell>
                            <TableCell className="py-2"><PriorityBadge priority={call?.priority ?? 'low'} /></TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{call?.company_size_tier ?? 'N/A'}</TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{call?.employee_count ?? 'N/A'}</TableCell>
                            <TableCell className="text-xs py-2 font-medium whitespace-nowrap">{call?.estimated_revenue ?? 'N/A'}</TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground max-w-[200px]">
                              <span className="block truncate">{notesPreview}</span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {sortedCalls.length > 0 && (
                  <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                    Showing {sortedCalls.length} of {activeCalls.length} calls
                    {(priorityFilter.length > 0 || companySearch || dateFrom || dateTo) && ' (filtered)'}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules" className="space-y-4 mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Schedule Management</h2>
                  <p className="text-xs text-muted-foreground">Manage automated scanning and digest schedules</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadSchedules} disabled={schedulesLoading}>
                  <HiOutlineArrowPath className={`w-3.5 h-3.5 mr-1 ${schedulesLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {schedulesLoading && schedules.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading schedules...</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relevantSchedules.length > 0
                  ? relevantSchedules.map(sched => (
                    <ScheduleCard
                      key={sched.id}
                      schedule={sched}
                      logs={executionLogs[sched.id] ?? []}
                      logsLoading={logsLoading[sched.id] ?? false}
                      onToggle={() => handleToggleSchedule(sched)}
                      onTrigger={() => handleTriggerSchedule(sched.id)}
                      onLoadLogs={() => loadLogs(sched.id)}
                      actionStatus={scheduleActionStatus[sched.id] ?? ''}
                    />
                  ))
                  : !schedulesLoading && (
                    <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                      <HiOutlineCalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No schedules found. They may not have been created yet.</p>
                    </div>
                  )
                }
              </div>

              {schedules.filter(s => s?.id !== SCHEDULE_IDS.EMAIL_SCANNER && s?.id !== SCHEDULE_IDS.MORNING_DIGEST).length > 0 && (
                <>
                  <Separator />
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Schedules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.filter(s => s?.id !== SCHEDULE_IDS.EMAIL_SCANNER && s?.id !== SCHEDULE_IDS.MORNING_DIGEST).map(sched => (
                      <ScheduleCard
                        key={sched.id}
                        schedule={sched}
                        logs={executionLogs[sched.id] ?? []}
                        logsLoading={logsLoading[sched.id] ?? false}
                        onToggle={() => handleToggleSchedule(sched)}
                        onTrigger={() => handleTriggerSchedule(sched.id)}
                        onLoadLogs={() => loadLogs(sched.id)}
                        actionStatus={scheduleActionStatus[sched.id] ?? ''}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Digest Tab */}
            <TabsContent value="digest" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HiOutlineEnvelope className="w-4 h-4 text-primary" />
                      Digest Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div>
                      <Label htmlFor="digest-email" className="text-xs">Recipient Email</Label>
                      <Input
                        id="digest-email"
                        type="email"
                        placeholder="your-email@company.com"
                        value={digestEmail}
                        onChange={e => setDigestEmail(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use the default configured recipient.</p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={handleSendDigest}
                      disabled={isSendingDigest}
                    >
                      {isSendingDigest ? (
                        <><HiOutlineArrowPath className="w-3.5 h-3.5 mr-1 animate-spin" /> Sending...</>
                      ) : (
                        <><HiOutlineEnvelope className="w-3.5 h-3.5 mr-1" /> Send Digest Now</>
                      )}
                    </Button>
                    {digestStatus && (
                      <div className={`text-xs px-2 py-1.5 rounded ${digestStatus.includes('success') ? 'bg-green-50 text-green-700' : digestStatus.includes('Error') || digestStatus.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                        {digestStatus}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HiOutlineDocumentText className="w-4 h-4 text-primary" />
                      Next Digest Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/50 p-2 rounded">
                          <span className="text-muted-foreground">New Calls:</span>
                          <span className="font-semibold ml-1">{activeSummary.new_calls}</span>
                        </div>
                        <div className="bg-muted/50 p-2 rounded">
                          <span className="text-muted-foreground">High Priority:</span>
                          <span className="font-semibold ml-1">{activeSummary.high_priority}</span>
                        </div>
                        <div className="bg-muted/50 p-2 rounded">
                          <span className="text-muted-foreground">Today&apos;s Calls:</span>
                          <span className="font-semibold ml-1">{activeSummary.todays_calls}</span>
                        </div>
                        <div className="bg-muted/50 p-2 rounded">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold ml-1">{activeSummary.total_calls}</span>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Calls to Include</h4>
                        <ScrollArea className="max-h-52">
                          <div className="space-y-1.5">
                            {activeCalls.length === 0 && (
                              <p className="text-xs text-muted-foreground">No calls to include in digest.</p>
                            )}
                            {activeCalls.map((call, i) => (
                              <div key={call?.call_id ?? i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <PriorityBadge priority={call?.priority ?? 'low'} />
                                  <span className="font-medium">{call?.company_name ?? 'Unknown'}</span>
                                </div>
                                <span className="text-muted-foreground whitespace-nowrap ml-2">{call?.call_date ?? 'N/A'} {call?.call_time ?? ''}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Agent Status */}
          <Card className="border-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <HiOutlineInformationCircle className="w-3.5 h-3.5" />
                Pipeline Agents
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {Object.entries(AGENTS).map(([key, agent]) => {
                  const isActive = activeAgentId === agent.id
                  return (
                    <div key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{agent.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Detail Panel */}
        {selectedCall && (
          <DetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />
        )}
      </div>
    </ErrorBoundary>
  )
}
