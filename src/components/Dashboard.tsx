import React from 'react';
import { Project, Task, TaskStatus, Company, UserProfile } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Trash2, 
  Plus, 
  Layout, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  FolderOpen,
  MapPin,
  Briefcase,
  Globe,
  Monitor
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  company: Company;
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  currentUserId: string;
  onProjectSelect: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
  onUpdateCompany: (data: { 
    name: string; 
    location?: string; 
    website?: string; 
    industry?: string; 
    memberIds?: string[]; 
    adminIds?: string[] 
  }) => void;
  onDeleteCompany: (companyId: string) => void;
}

export function Dashboard({ 
  company,
  projects, 
  tasks, 
  users,
  currentUserId,
  onProjectSelect, 
  onEditProject, 
  onDeleteProject,
  onNewProject,
  onUpdateCompany,
  onDeleteCompany
}: DashboardProps) {
  
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState('');
  
  // Local state for company settings to avoid uncontrolled component warnings
  const [companyName, setCompanyName] = React.useState(company?.name || '');
  const [companyLocation, setCompanyLocation] = React.useState(company?.location || '');
  const [companyIndustry, setCompanyIndustry] = React.useState(company?.industry || '');
  const [companyWebsite, setCompanyWebsite] = React.useState(company?.website || '');

  // Sync local state when company prop changes
  React.useEffect(() => {
    setCompanyName(company?.name || '');
    setCompanyLocation(company?.location || '');
    setCompanyIndustry(company?.industry || '');
    setCompanyWebsite(company?.website || '');
  }, [company]);

  const getProjectStats = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const closedStageId = project?.stages?.[project.stages.length - 1]?.id || 'closed';
    const todoStageId = project?.stages?.[0]?.id || 'todo';

    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completed = projectTasks.filter(t => t.status === closedStageId).length;
    const inProgress = projectTasks.filter(t => t.status !== todoStageId && t.status !== closedStageId).length;
    const total = projectTasks.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    return { total, completed, inProgress, progress };
  };

  const totalTasks = tasks.length;
  // Fallback if no project available for a task
  const totalCompleted = tasks.filter(t => {
    const project = projects.find(p => p.id === t.projectId);
    const closedStageId = project?.stages?.[project.stages.length - 1]?.id || 'closed';
    return t.status === closedStageId;
  }).length;
  const activeProjects = projects.length;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-sans">
              {company.name} Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {company.location && (
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {company.location}
                </div>
              )}
              {company.industry && (
                <div className="flex items-center">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mr-4 hidden md:block" />
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {company.industry}
                </div>
              )}
              {company.website && (
                <div className="flex items-center">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mr-4 hidden md:block" />
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors flex items-center"
                  >
                    <Globe className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
          <Button onClick={onNewProject} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Button>
        </div>

        {/* Tabs for Workspaces and Setup */}
        <Tabs defaultValue="workspaces" className="w-full mt-8">
          <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="workspaces" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Workspaces</TabsTrigger>
            <TabsTrigger value="setup" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Company Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-6 md:space-y-8 mt-0 focus-visible:outline-none">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-sm bg-card overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <FolderOpen className="w-16 h-16" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Workspaces</CardDescription>
                  <CardTitle className="text-3xl font-bold text-foreground">{activeProjects}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-primary font-medium">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span>Active across accounts</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <CheckCircle2 className="w-16 h-16" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</CardDescription>
                  <CardTitle className="text-3xl font-bold text-foreground">{totalTasks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-secondary font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    <span>{totalCompleted} tasks completed</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <BarChart3 className="w-16 h-16" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">Overall Progress</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-primary-foreground/20 h-1.5 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${totalTasks === 0 ? 0 : (totalCompleted / totalTasks) * 100}%` }}
                      className="bg-primary-foreground h-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workspaces List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold text-foreground">Your Workspaces</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Layout className="w-4 h-4" />
                  <span>Grid View</span>
                </div>
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const stats = getProjectStats(project.id);
              return (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all group h-full flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-sm"
                          style={{ backgroundColor: project.color || 'var(--primary)' }}
                        >
                          {project.name.charAt(0)}
                        </div>
                        <div className="flex items-center space-x-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject(project);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="mt-4 text-lg text-foreground">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2 min-h-[2.5rem] text-muted-foreground">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                          <span>Completion Progress</span>
                          <span>{stats.progress}%</span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.progress}%` }}
                            className="bg-primary h-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-muted rounded-lg p-2 flex flex-col items-center">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                          <span className="text-sm font-bold text-foreground">{stats.total}</span>
                        </div>
                        <div className="bg-muted rounded-lg p-2 flex flex-col items-center">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Active</span>
                          <span className="text-sm font-bold text-primary">{stats.inProgress}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center -space-x-1.5">
                        {project.members?.slice(0, 3).map((member, i) => (
                          <div 
                            key={i} 
                            className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground"
                          >
                            <Users className="w-3 h-3" />
                          </div>
                        ))}
                        {project.members?.length > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-primary/10 font-semibold"
                        onClick={() => onProjectSelect(project)}
                      >
                        Open Workspace
                        <FolderOpen className="w-3.5 h-3.5 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}

            {projects.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                  <Layout className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">No workspaces yet</h3>
                  <p className="text-muted-foreground max-w-xs">Create your first workspace to start organizing your projects and tasks.</p>
                </div>
                <Button onClick={onNewProject} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
        </TabsContent>

        <TabsContent value="setup" className="focus-visible:outline-none">
          <Card className="max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Company Settings</CardTitle>
              <CardDescription>Manage your company details and team members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company Name</label>
                <div className="flex gap-2">
                  <Input 
                     value={companyName}
                     onChange={(e) => setCompanyName(e.target.value)}
                     className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <Input 
                     value={companyLocation}
                     onChange={(e) => setCompanyLocation(e.target.value)}
                     placeholder="e.g., San Francisco"
                     className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Industry</label>
                  <Input 
                     value={companyIndustry}
                     onChange={(e) => setCompanyIndustry(e.target.value)}
                     placeholder="e.g., Technology"
                     className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Website</label>
                <Input 
                   value={companyWebsite}
                   onChange={(e) => setCompanyWebsite(e.target.value)}
                   placeholder="e.g., https://acme.com"
                   className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    if (companyName.trim()) {
                      onUpdateCompany({ 
                        name: companyName.trim(), 
                        location: companyLocation.trim() || undefined,
                        industry: companyIndustry.trim() || undefined,
                        website: companyWebsite.trim() || undefined,
                        memberIds: company?.memberIds, 
                        adminIds: company?.adminIds 
                      });
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                >Save Changes</Button>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-foreground">Team Members ({company?.memberIds?.length || 0})</h3>
                </div>
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto w-full p-2 space-y-1">
                    {users.map(user => {
                      const isOwner = user.uid === company?.ownerId;
                      const isMember = company?.memberIds?.includes(user.uid) || false;
                      const isAdmin = company?.adminIds?.includes(user.uid) || false;
                      
                      const toggleMember = () => {
                        if (isOwner) return;
                        let newMembers = company?.memberIds || [];
                        let newAdmins = company?.adminIds || [];
                        
                        if (isMember) {
                          newMembers = newMembers.filter(id => id !== user.uid);
                          newAdmins = newAdmins.filter(id => id !== user.uid);
                        } else {
                          newMembers = [...newMembers, user.uid];
                        }
                        onUpdateCompany({ name: company.name, memberIds: newMembers, adminIds: newAdmins });
                      };

                      const toggleAdmin = () => {
                        if (isOwner) return;
                        let newAdmins = company?.adminIds || [];
                        let newMembers = company?.memberIds || [];
                        
                        if (isAdmin) {
                          newAdmins = newAdmins.filter(id => id !== user.uid);
                        } else {
                          newAdmins = [...newAdmins, user.uid];
                          if (!isMember) {
                            newMembers = [...newMembers, user.uid];
                          }
                        }
                        onUpdateCompany({ name: company.name, memberIds: newMembers, adminIds: newAdmins });
                      };

                      return (
                        <div 
                          key={user.uid} 
                          className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-md transition-colors w-full"
                        >
                           <Checkbox 
                             checked={isMember}
                             onCheckedChange={toggleMember}
                             disabled={isOwner || (currentUserId !== company?.ownerId && !company?.adminIds?.includes(currentUserId))}
                             className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground shrink-0"
                           />
                           <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0">
                             <AvatarImage src={user.photoURL || undefined} />
                             <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                               {user.displayName?.[0] || 'U'}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col flex-1 min-w-0">
                             <span className="text-sm font-medium text-foreground truncate">
                               {user.displayName || 'Anonymous User'}
                             </span>
                             <span className="text-xs text-muted-foreground truncate">
                               {user.email}
                             </span>
                           </div>
                           <div className="flex items-center space-x-2 shrink-0">
                             <label className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center space-x-2">
                               <Checkbox 
                                 checked={isAdmin}
                                 disabled={isOwner || !isMember || (currentUserId !== company?.ownerId && !company?.adminIds?.includes(currentUserId))}
                                 onCheckedChange={toggleAdmin}
                                 className="h-4 w-4"
                               />
                               <span className="hidden sm:inline">Admin</span>
                             </label>
                             {isOwner && (
                               <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] ml-2">Owner</Badge>
                             )}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
            {company?.ownerId === currentUserId && (
              <CardFooter className="bg-muted/50 px-6 py-4 border-t border-border flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Deleting a company is irreversible.</p>
                <div className="flex items-center gap-2">
                  {isConfirmingDelete ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsConfirmingDelete(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={async () => {
                          try {
                            await onDeleteCompany(company.id);
                          } catch (err) {
                            console.error("Failed to delete company:", err);
                          } finally {
                            setIsConfirmingDelete(false);
                          }
                        }}
                      >
                        Confirm Delete
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setIsConfirmingDelete(true)}
                    >
                      Delete Company
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        </Tabs>

        {/* Delete Project Confirmation Dialog */}
        <Dialog open={!!projectToDelete} onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null);
            setDeleteConfirmName('');
          }
        }}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-red-500 font-bold flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Delete Workspace
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                This will permanently delete the <strong>{projectToDelete?.name}</strong> workspace and all its tasks, comments, and attachments. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground mb-1">
                  To confirm, type <span className="font-bold select-none">{projectToDelete?.name}</span> in the box below:
                </p>
                <Input 
                  value={deleteConfirmName} 
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Workspace name"
                  className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-red-500 text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="ghost" 
                onClick={() => setProjectToDelete(null)}
                className="hover:bg-muted"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={deleteConfirmName !== projectToDelete?.name}
                onClick={() => {
                  if (projectToDelete) {
                    onDeleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                    setDeleteConfirmName('');
                  }
                }}
                className="font-bold"
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
