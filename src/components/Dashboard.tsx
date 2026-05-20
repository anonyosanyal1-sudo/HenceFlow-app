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
    <div className="flex-1 overflow-y-auto bg-transparent p-6 md:p-12 relative z-10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground">
              {company.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {company.location && <span>{company.location}</span>}
              {company.industry && <span>{company.industry}</span>}
              {company.website && (
                <a 
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
          <Button onClick={onNewProject} variant="outline" className="w-full md:w-auto h-9 px-4 text-xs rounded-full shadow-none hover:bg-muted font-medium border-border/40">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Workspace
          </Button>
        </div>

        {/* Tabs for Workspaces and Setup */}
        <Tabs defaultValue="workspaces" className="w-full">
          <TabsList className="bg-transparent w-full justify-start border-b border-border/40 p-0 h-auto rounded-none space-x-6 mb-8 mt-4">
            <TabsTrigger value="workspaces" className="pb-3 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground font-medium transition-none">Workspaces</TabsTrigger>
            <TabsTrigger value="setup" className="pb-3 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground font-medium transition-none">Company Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-6 md:space-y-8 mt-0 focus-visible:outline-none">
            {/* Global Stats - Minimal */}
            <div className="flex flex-wrap md:flex-nowrap gap-8 items-center text-sm mb-12">
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">Total Workspaces</span>
                <span className="text-3xl font-light text-foreground">{activeProjects}</span>
              </div>
              <div className="w-px h-10 bg-border/40 hidden md:block" />
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">Completed Tasks</span>
                <span className="text-3xl font-light text-foreground">{totalCompleted} <span className="text-lg text-muted-foreground">/ {totalTasks}</span></span>
              </div>
              <div className="w-px h-10 bg-border/40 hidden md:block" />
              <div className="flex flex-col space-y-2 flex-1 max-w-xs pt-1">
                <div className="flex items-center justify-between w-full">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-medium">{totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)}%</span>
                </div>
                <div className="w-full bg-border/40 h-[2px] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalTasks === 0 ? 0 : (totalCompleted / totalTasks) * 100}%` }}
                    className="bg-foreground h-full"
                  />
                </div>
              </div>
            </div>

            {/* Workspaces List */}
            <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const stats = getProjectStats(project.id);
              return (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="bg-card/40 border-border/40 shadow-none hover:bg-card/80 transition-colors group h-full flex flex-col rounded-2xl cursor-pointer"
                    onClick={() => onProjectSelect(project)}
                  >
                    <CardHeader className="p-5 pb-0 border-none">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color || 'var(--primary)' }}
                          />
                          <CardTitle className="text-base font-medium text-foreground">{project.name}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
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
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2 mt-2 text-xs text-muted-foreground min-h-[2rem]">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="flex-1 p-5 pt-4 border-none flex flex-col justify-end">
                      <div className="w-full bg-border/40 h-[2px] rounded-full overflow-hidden mb-4">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.progress}%` }}
                          className="bg-foreground/40 h-full"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center gap-1.5" title="Tasks completed">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {stats.completed}/{stats.total}
                          </span>
                          <span className="flex items-center gap-1.5" title="Tasks in progress">
                            <Clock className="w-3.5 h-3.5" />
                            {stats.inProgress}
                          </span>
                        </div>
                        <div className="flex items-center -space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {project.members?.slice(0, 3).map((member, i) => (
                            <div 
                              key={i} 
                              className="w-5 h-5 rounded-full border border-card bg-muted flex items-center justify-center text-[8px] font-medium text-foreground"
                            >
                              <Users className="w-2.5 h-2.5" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {projects.length === 0 && (
              <div className="col-span-full border border-dashed border-border/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Layout className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground">No workspaces yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">Create your first workspace to start organizing your projects and tasks.</p>
                </div>
                <Button onClick={onNewProject} variant="outline" className="mt-2 h-9 text-xs rounded-full shadow-none border-border/50 hover:bg-muted font-medium">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Workspace
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
