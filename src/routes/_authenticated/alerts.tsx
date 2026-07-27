import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

type AlertRow = {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  status: 'pending' | 'reviewed' | 'dismissed' | 'resolved'
  title: string
  description: string | null
  data: Record<string, unknown> | null
  assigned_to_role: string | null
  created_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
}

export const Route = createFileRoute('/_authenticated/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [reviewNotes, setReviewNotes] = useState('')

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['alerts', filterStatus, filterSeverity],
    queryFn: async () => {
      let query = supabase.from('event_alerts').select('*')

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (filterSeverity) {
        query = query.eq('severity', filterSeverity)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      return (data || []) as AlertRow[]
    },
  })

  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, status, notes }: { alertId: string; status: string; notes?: string }) => {
      const { error } = await supabase.from('event_alerts').update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes,
      }).eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      refetch()
      toast.success('Alerta actualizada')
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const ids = Array.from(selectedAlerts)
      if (ids.length === 0) return

      const { error } = await supabase.from('event_alerts')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reviewNotes,
        })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      setSelectedAlerts(new Set())
      setReviewNotes('')
      refetch()
      toast.success('Alertas actualizadas')
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const toggleAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts)
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId)
    } else {
      newSelected.add(alertId)
    }
    setSelectedAlerts(newSelected)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas del Sistema</h1>
        <p className="text-muted-foreground">Gestiona eventos de nómina, empleados y cambios operacionales</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="reviewed">Revisado</SelectItem>
            <SelectItem value="dismissed">Descartado</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            <SelectItem value="info">Información</SelectItem>
            <SelectItem value="warning">Advertencia</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
          </SelectContent>
        </Select>

        {selectedAlerts.size > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                Procesar {selectedAlerts.size} alerta{selectedAlerts.size === 1 ? '' : 's'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Actualizar alertas seleccionadas</DialogTitle>
                <DialogDescription>
                  Cambia el estado de {selectedAlerts.size} alerta{selectedAlerts.size === 1 ? '' : 's'} y añade notas si es necesario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nuevo estado</label>
                  <Select defaultValue="reviewed">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reviewed">Revisado</SelectItem>
                      <SelectItem value="dismissed">Descartado</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notas (opcional)</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Añade notas sobre esta actualización..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => bulkUpdateMutation.mutate({ status: 'reviewed' })}
                  disabled={bulkUpdateMutation.isPending}
                >
                  Actualizar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas activas</CardTitle>
          <CardDescription>
            {alerts.length} alerta{alerts.length === 1 ? '' : 's'} encontrada{alerts.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando alertas...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay alertas que mostrar
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isSelected={selectedAlerts.has(alert.id)}
                  onToggle={() => toggleAlert(alert.id)}
                  onUpdate={(status, notes) =>
                    updateAlertMutation.mutate({ alertId: alert.id, status, notes })
                  }
                  getSeverityIcon={getSeverityIcon}
                  getSeverityColor={getSeverityColor}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AlertRow({
  alert,
  isSelected,
  onToggle,
  onUpdate,
  getSeverityIcon,
  getSeverityColor,
}: {
  alert: AlertRow
  isSelected: boolean
  onToggle: () => void
  onUpdate: (status: string, notes?: string) => void
  getSeverityIcon: (severity: string) => React.ReactNode
  getSeverityColor: (severity: string) => string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex gap-4 items-start">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex gap-2 items-start mb-2">
            {getSeverityIcon(alert.severity)}
            <div className="flex-1">
              <h3 className="font-semibold">{alert.title}</h3>
              {alert.description && (
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant={getSeverityColor(alert.severity)}>
                {alert.severity}
              </Badge>
              <Badge variant="outline">
                {alert.status}
              </Badge>
            </div>
          </div>

          {isExpanded && (
            <div className="text-xs text-muted-foreground space-y-2 mt-3 pt-3 border-t">
              <div>
                <strong>Tipo:</strong> {alert.alert_type}
              </div>
              {alert.assigned_to_role && (
                <div>
                  <strong>Asignado a:</strong> {alert.assigned_to_role}
                </div>
              )}
              <div>
                <strong>Creado:</strong> {new Date(alert.created_at).toLocaleString()}
              </div>
              {alert.reviewed_at && (
                <div>
                  <strong>Revisado:</strong> {new Date(alert.reviewed_at).toLocaleString()}
                </div>
              )}
              {alert.reviewer_notes && (
                <div>
                  <strong>Notas:</strong> {alert.reviewer_notes}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {isExpanded && alert.status === 'pending' && (
        <div className="mt-3 pt-3 border-t flex gap-2 ml-12">
          <Button
            size="sm"
            onClick={() => onUpdate('reviewed')}
          >
            Marcar como revisado
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUpdate('dismissed')}
          >
            Descartar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUpdate('resolved')}
          >
            Resolver
          </Button>
        </div>
      )}
    </div>
  )
}
