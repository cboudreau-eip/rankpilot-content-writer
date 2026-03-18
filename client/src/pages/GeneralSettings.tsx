import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  User, Bell, Palette, Shield, Globe, Mail, KeyRound, Monitor, Moon, Sun
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SettingsTab = "account" | "notifications" | "appearance";

const tabs = [
  { id: "account" as const, label: "Account", icon: User, description: "Manage your profile and account details" },
  { id: "notifications" as const, label: "Notifications", icon: Bell, description: "Configure how you receive alerts" },
  { id: "appearance" as const, label: "Appearance", icon: Palette, description: "Customize the look and feel" },
];

export default function GeneralSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Notification preferences (local state for now)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [articleComplete, setArticleComplete] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [gradeAlerts, setGradeAlerts] = useState(true);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg mt-1">Manage your account preferences and app configuration.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-medium transition-all ${
                isActive
                  ? "bg-white shadow-md border border-border/60 text-foreground"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? "bg-primary/10" : "bg-muted"
              }`}>
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </CardTitle>
              <CardDescription>Your account information from Manus OAuth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2">
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-purple-500 text-white">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{user?.name || "User"}</h3>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="w-4 h-4" />
                    {user?.email || "No email set"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      <Shield className="w-3 h-3 mr-1" />
                      {user?.role || "user"}
                    </Badge>
                    <Badge variant="outline">
                      <KeyRound className="w-3 h-3 mr-1" />
                      {user?.loginMethod || "manus"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Display Name</Label>
                  <Input value={user?.name || ""} disabled className="text-base bg-muted" />
                  <p className="text-xs text-muted-foreground">Managed through your Manus account.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Email</Label>
                  <Input value={user?.email || ""} disabled className="text-base bg-muted" />
                  <p className="text-xs text-muted-foreground">Managed through your Manus account.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                API & Integrations
              </CardTitle>
              <CardDescription>Manage external service connections.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Manus Built-in LLM</p>
                      <p className="text-sm text-muted-foreground">Default AI model for content generation</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Claude (Anthropic)</p>
                      <p className="text-sm text-muted-foreground">Alternative AI model — coming soon</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("Claude integration coming soon!")}>
                    Configure
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Google Search Console</p>
                      <p className="text-sm text-muted-foreground">Connect for GSC Analyzer — coming soon</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("GSC integration coming soon!")}>
                    Connect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Article Generation Complete</p>
                  <p className="text-sm text-muted-foreground">Get notified when an article finishes generating</p>
                </div>
                <Switch checked={articleComplete} onCheckedChange={setArticleComplete} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Content Grade Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when content scores below threshold</p>
                </div>
                <Switch checked={gradeAlerts} onCheckedChange={setGradeAlerts} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">Summary of your content performance each week</p>
                </div>
                <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast.success("Notification preferences saved!")}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Theme
              </CardTitle>
              <CardDescription>Customize the visual appearance of the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-primary bg-primary/5 transition-all"
                  onClick={() => toast.info("Light theme is active")}
                >
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-border flex items-center justify-center shadow-sm">
                    <Sun className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="font-semibold">Light</span>
                  <Badge className="bg-primary/10 text-primary text-xs">Active</Badge>
                </button>

                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/50 transition-all"
                  onClick={() => toast.info("Dark theme coming soon!")}
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center">
                    <Moon className="w-6 h-6 text-gray-300" />
                  </div>
                  <span className="font-semibold">Dark</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </button>

                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/50 transition-all"
                  onClick={() => toast.info("System theme coming soon!")}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-gray-900 border border-border flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-gray-500" />
                  </div>
                  <span className="font-semibold">System</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Display</CardTitle>
              <CardDescription>Adjust how content is displayed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Compact Sidebar</p>
                  <p className="text-sm text-muted-foreground">Use the collapse button in the header to toggle</p>
                </div>
                <Badge variant="outline">Toggle via header</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Show Word Count in Articles List</p>
                  <p className="text-sm text-muted-foreground">Display word count column in the articles table</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
