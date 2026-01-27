import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    Clock,
    Activity,
    FileText,
    Users,
    Lock,
    Eye,
    RefreshCw,
} from "lucide-react";

interface AuditLog {
    id: string;
    action_type: string;
    action_description: string;
    resource_type: string;
    resource_id: string;
    outcome: string;
    created_at: string;
    actor_email: string;
}

interface SecurityIncident {
    id: string;
    incident_type: string;
    severity: string;
    title: string;
    description: string;
    status: string;
    detected_at: string;
    created_at: string;
}

interface AuditSummary {
    period: { start: string; end: string };
    action_summary: Array<{
        action_type: string;
        total_count: number;
        success_count: number;
        failure_count: number;
        unique_actors: number;
    }>;
    incidents: {
        total: number;
        by_status: Record<string, number>;
        by_severity: Record<string, number>;
    };
}

export function SecurityDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [summary, setSummary] = useState<AuditSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load audit logs
            const { data: logsData } = await supabase.functions.invoke("soc2-audit", {
                body: { action: "get_logs", limit: 50 },
            });
            if (logsData?.logs) setLogs(logsData.logs);

            // Load incidents
            const { data: incidentsData } = await supabase.functions.invoke("soc2-audit", {
                body: { action: "get_incidents", limit: 20 },
            });
            if (incidentsData?.incidents) setIncidents(incidentsData.incidents);

            // Load summary
            const { data: summaryData } = await supabase.functions.invoke("soc2-audit", {
                body: { action: "get_summary" },
            });
            if (summaryData) setSummary(summaryData);

        } catch (error) {
            console.error("Failed to load security data:", error);
            toast({
                title: "Error",
                description: "Failed to load security dashboard data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-500";
            case "high": return "bg-orange-500";
            case "medium": return "bg-yellow-500";
            case "low": return "bg-blue-500";
            default: return "bg-gray-500";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "open": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "investigating": return <Activity className="h-4 w-4 text-blue-500" />;
            case "contained": return <Shield className="h-4 w-4 text-orange-500" />;
            case "resolved": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "closed": return <Lock className="h-4 w-4 text-gray-500" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security & Compliance Dashboard
                        </CardTitle>
                        <CardDescription>
                            SOC 2 audit logs, security incidents, and compliance monitoring
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="logs">Audit Logs</TabsTrigger>
                        <TabsTrigger value="incidents">Incidents</TabsTrigger>
                        <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        {summary && (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-8 w-8 text-blue-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">
                                                        {summary.action_summary.reduce((sum, a) => sum + a.total_count, 0)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Total Events</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-8 w-8 text-red-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{summary.incidents.total}</p>
                                                    <p className="text-sm text-muted-foreground">Incidents</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-8 w-8 text-green-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">
                                                        {summary.action_summary.reduce((max, a) => Math.max(max, a.unique_actors), 0)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Active Users</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-8 w-8 text-green-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">
                                                        {(
                                                            (summary.action_summary.reduce((sum, a) => sum + a.success_count, 0) /
                                                                summary.action_summary.reduce((sum, a) => sum + a.total_count, 0)) *
                                                            100
                                                        ).toFixed(1)}%
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Success Rate</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Incident Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Incidents by Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {Object.entries(summary.incidents.by_status).map(([status, count]) => (
                                                    <div key={status} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(status)}
                                                            <span className="capitalize">{status}</span>
                                                        </div>
                                                        <Badge variant="secondary">{count}</Badge>
                                                    </div>
                                                ))}
                                                {Object.keys(summary.incidents.by_status).length === 0 && (
                                                    <p className="text-sm text-muted-foreground">No incidents reported</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Incidents by Severity</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {Object.entries(summary.incidents.by_severity).map(([severity, count]) => (
                                                    <div key={severity} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                                                            <span className="capitalize">{severity}</span>
                                                        </div>
                                                        <Badge variant="secondary">{count}</Badge>
                                                    </div>
                                                ))}
                                                {Object.keys(summary.incidents.by_severity).length === 0 && (
                                                    <p className="text-sm text-muted-foreground">No incidents reported</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* Audit Logs Tab */}
                    <TabsContent value="logs">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50"
                                    >
                                        <div className="flex-shrink-0">
                                            {log.outcome === "success" ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{log.action_type.replace(/\./g, " → ")}</p>
                                            {log.action_description && (
                                                <p className="text-sm text-muted-foreground">{log.action_description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>{log.actor_email || "System"}</span>
                                                <span>•</span>
                                                <span>{formatDate(log.created_at)}</span>
                                                {log.resource_type && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {log.resource_type}
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No audit logs found</p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Incidents Tab */}
                    <TabsContent value="incidents">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                                {incidents.map((incident) => (
                                    <Card key={incident.id}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    {getStatusIcon(incident.status)}
                                                    <div>
                                                        <p className="font-medium">{incident.title}</p>
                                                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge className={getSeverityColor(incident.severity)}>
                                                                {incident.severity}
                                                            </Badge>
                                                            <Badge variant="outline">{incident.incident_type}</Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDate(incident.detected_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {incidents.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                        No security incidents reported
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Compliance Tab */}
                    <TabsContent value="compliance">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        SOC 2 Controls
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span>Access Control</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Audit Logging</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Encryption at Rest</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Encryption in Transit</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Incident Management</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        PCI DSS Controls
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span>Card Data Handling (Stripe)</span>
                                            <Badge className="bg-green-500">Compliant</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Security Headers</span>
                                            <Badge className="bg-green-500">Enabled</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Failed Login Tracking</span>
                                            <Badge className="bg-green-500">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>TLS 1.2+</span>
                                            <Badge className="bg-green-500">Enforced</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default SecurityDashboard;
