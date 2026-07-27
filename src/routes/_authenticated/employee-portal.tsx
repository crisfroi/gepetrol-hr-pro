import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, FileText, Calendar, User, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated/employee-portal')({
  component: EmployeePortal,
})

function EmployeePortal() {
  const currentUser = supabase.auth.useUser()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Portal del Empleado</h1>
        <p className="text-muted-foreground">Gestiona tus datos, solicitudes y documentos</p>
      </div>

      <Tabs defaultValue="payslips" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payslips">Recibos</TabsTrigger>
          <TabsTrigger value="leave">Permisos</TabsTrigger>
          <TabsTrigger value="personal">Datos</TabsTrigger>
          <TabsTrigger value="schedule">Horario</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips">
          <PayslipsTab />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveTab />
        </TabsContent>

        <TabsContent value="personal">
          <PersonalDataTab />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PayslipsTab() {
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['employee-payslips'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_employee_payslips', {
        _limit: 24,
        _offset: 0,
      })
      if (error) throw error
      return data || []
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async (payslipId: string) => {
      await (supabase as any).rpc('record_payslip_download', {
        _payslip_id: payslipId,
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Recibos de Nómina</CardTitle>
        <CardDescription>Descarga tus recibos de nómina históricos</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando recibos...</div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay recibos disponibles</div>
        ) : (
          <div className="space-y-2">
            {payslips.map((payslip: any) => (
              <div
                key={payslip.payslip_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      Período: {new Date(payslip.period_start).toLocaleDateString()} - {new Date(payslip.period_end).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Salario: {payslip.currency} {payslip.gross.toLocaleString()} | Neto: {payslip.currency} {payslip.net.toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {payslip.pdf_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadMutation.mutate(payslip.payslip_id)
                        window.open(payslip.pdf_url, '_blank')
                        toast.success('Descargando recibo...')
                      }}
                    >
                      <Download className="h-4 w-4" /> Descargar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    Ver Detalles
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaveTab() {
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_employee_leave_balance')
      if (error) throw error
      return data?.[0] || null
    },
  })

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('request_leave_from_portal', {
        _leave_type: leaveType,
        _start_date: startDate,
        _end_date: endDate,
        _reason: reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Solicitud de permiso enviada')
      setStartDate('')
      setEndDate('')
      setReason('')
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Saldo de Permisos</CardTitle>
          <CardDescription>Tu saldo actual de días de permiso</CardDescription>
        </CardHeader>
        <CardContent>
          {balance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Saldo disponible</Label>
                  <p className="text-2xl font-bold">{balance.balance} días</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Utilizados</Label>
                  <p className="text-2xl font-bold">{balance.used} días</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Solicitudes pendientes</Label>
                <p className="text-lg font-semibold">{balance.pending} días</p>
              </div>
              {balance.expires_at && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    Vencimiento: {new Date(balance.expires_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Cargando saldo...</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitar Permiso</CardTitle>
          <CardDescription>Envía una nueva solicitud de permiso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Permiso</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Vacaciones</SelectItem>
                <SelectItem value="sick">Enfermedad</SelectItem>
                <SelectItem value="unpaid">Sin pagar</SelectItem>
                <SelectItem value="special">Especial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo de tu solicitud..."
              className="min-h-[100px]"
            />
          </div>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={!startDate || !endDate || requestMutation.isPending}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" /> Solicitar Permiso
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function PersonalDataTab() {
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')

  const { data: employee, isLoading } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').limit(1).single()
      if (error) throw error
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('update_employee_personal_data', {
        _address: address || null,
        _phone: phone || null,
        _bank_account: bankAccount || null,
        _emergency_contact: emergencyContact || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Datos actualizados correctamente')
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  if (isLoading) return <div className="text-center py-8">Cargando datos...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Datos Personales</CardTitle>
        <CardDescription>Actualiza tu información de contacto y fiscal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Teléfono</Label>
            <Input
              value={phone || employee?.phone || ''}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Tu número de teléfono"
            />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input
              value={address || employee?.address || ''}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Tu dirección"
            />
          </div>
        </div>
        <div>
          <Label>Número de Cuenta Bancaria</Label>
          <Input
            type="password"
            value={bankAccount || employee?.bank_account || ''}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="IBAN u otro número de cuenta"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {employee?.bank_account_updated_at
              ? `Última actualización: ${new Date(employee.bank_account_updated_at).toLocaleDateString()}`
              : 'No actualizado'}
          </p>
        </div>
        <div>
          <Label>Contacto de Emergencia</Label>
          <Input
            value={emergencyContact || employee?.emergency_contact || ''}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="Nombre y teléfono"
          />
        </div>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          <User className="h-4 w-4 mr-2" /> Guardar Cambios
        </Button>
      </CardContent>
    </Card>
  )
}

function ScheduleTab() {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['employee-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(
          `
          id,
          first_name,
          last_name,
          employment_contracts(
            schedule_type,
            weekly_hours,
            start_date
          )
        `
        )
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <div className="text-center py-8">Cargando horario...</div>

  const contract = schedule?.employment_contracts?.[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Horario</CardTitle>
        <CardDescription>Tu horario de trabajo actual</CardDescription>
      </CardHeader>
      <CardContent>
        {contract ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tipo de horario</Label>
                <Badge>{contract.schedule_type}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Horas semanales</Label>
                <p className="font-semibold">{contract.weekly_hours}h</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Vigente desde</Label>
              <p className="font-semibold">{new Date(contract.start_date).toLocaleDateString()}</p>
            </div>
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-muted-foreground">
                Para cambios en tu horario, contacta al departamento de RR.HH.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No hay contrato activo</div>
        )}
      </CardContent>
    </Card>
  )
}
