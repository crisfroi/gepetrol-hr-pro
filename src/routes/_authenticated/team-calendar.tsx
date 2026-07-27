import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Calendar, MapPin, Users, Gift, Briefcase } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated/team-calendar')({
  component: TeamCalendarPage,
})

function TeamCalendarPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name').eq('active', true)
      if (error) throw error
      return data || []
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Calendario del Equipo</h1>
        <p className="text-muted-foreground">Visualiza la presencia, eventos y hitos del equipo</p>
      </div>

      <Tabs defaultValue="presence" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="presence">Presencia</TabsTrigger>
          <TabsTrigger value="milestones">Hitos</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="presence">
          <PresenceTab
            selectedDepartment={selectedDepartment}
            departments={departments}
            onDepartmentChange={setSelectedDepartment}
          />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTab />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PresenceTab({ selectedDepartment, departments, onDepartmentChange }: any) {
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-presence', selectedDepartment],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_team_presence', {
        _department_id: selectedDepartment || null,
      })
      if (error) throw error
      return data || []
    },
  })

  const getPresenceBadge = (status: string) => {
    switch (status) {
      case 'in_office':
        return <Badge className="bg-green-600">En oficina</Badge>
      case 'remote':
        return <Badge className="bg-blue-600">Remoto</Badge>
      case 'on_leave':
        return <Badge className="bg-orange-600">De permiso</Badge>
      default:
        return <Badge variant="outline">Fuera</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Presencia del Equipo</CardTitle>
            <CardDescription>Estado actual de presencia y ubicación</CardDescription>
          </div>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los departamentos</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando presencia...</div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay empleados activos</div>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member: any) => (
              <div
                key={member.employee_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {member.first_name} {member.last_name}
                    </h3>
                    {getPresenceBadge(member.presence_status)}
                    {member.is_on_leave && <Badge variant="secondary">{member.leave_type}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.position} • {member.department}
                  </div>
                  {member.location && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {member.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MilestonesTab() {
  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_milestones_this_month')
      if (error) throw error
      return data || []
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumpleaños y Aniversarios</CardTitle>
        <CardDescription>Hitos importantes del equipo este mes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando hitos...</div>
        ) : milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay cumpleaños o aniversarios próximos
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone: any) => (
              <div
                key={`${milestone.employee_id}-${milestone.event_type}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {milestone.event_type === 'birthday' ? (
                    <Gift className="h-5 w-5 text-pink-500" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <h3 className="font-medium">
                      {milestone.first_name} {milestone.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {milestone.event_type === 'birthday' ? 'Cumpleaños' : 'Aniversario de trabajo'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {new Date(milestone.date_of_event).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.days_until_event === 0
                      ? '¡Hoy!'
                      : `En ${milestone.days_until_event} días`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventsTab() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', today.toISOString())
        .lte('start_time', nextMonth.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error
      return data || []
    },
  })

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'meeting':
        return <Users className="h-4 w-4" />
      case 'birthday':
        return <Gift className="h-4 w-4" />
      case 'holiday':
        return <Calendar className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos Próximos</CardTitle>
        <CardDescription>Reuniones, eventos de empresa y días festivos</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay eventos próximos</div>
        ) : (
          <div className="space-y-3">
            {events.map((event: any) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex gap-3 flex-1">
                  <div className="mt-1">{getEventTypeIcon(event.event_type)}</div>
                  <div className="flex-1">
                    <h3 className="font-medium">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{event.event_type}</Badge>
                      {event.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">
                    {new Date(event.start_time).toLocaleDateString()}
                  </p>
                  {!event.all_day && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
