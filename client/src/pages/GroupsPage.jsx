// ============================================================
// PHH Inventory — Groups Page
// Premium responsive dashboard for custom sheet grouping
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { groupApi, sheetApi } from "../lib/api";
import SheetCard from "../components/sheet/SheetCard";
import { useRole } from "../hooks/useRole";
import {
  Folder,
  Plus,
  Pin,
  Trash2,
  Edit2,
  FolderOpen,
  ArrowRight,
  X,
  AlertTriangle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from "lucide-react";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { isManager } = useRole();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Selected/Active Group
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeGroupSheets, setActiveGroupSheets] = useState([]);
  const [loadingActiveGroup, setLoadingActiveGroup] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedSheetIds, setSelectedSheetIds] = useState([]);
  
  // Sheet list for selection
  const [allSheets, setAllSheets] = useState([]);
  const [sheetSearch, setSheetSearch] = useState("");
  const [loadingSheets, setLoadingSheets] = useState(false);

  // Fetch groups list
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await groupApi.list();
      setGroups(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setError("Failed to load sheet groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all sheets for group item selection
  const fetchAllSheetsForSelection = async () => {
    setLoadingSheets(true);
    try {
      // Fetch all sheets (both root and nested to let users group anything)
      const res = await sheetApi.list({ limit: 100 });
      setAllSheets(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch sheets for selection:", err);
    } finally {
      setLoadingSheets(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Load detailed sheets for the active group
  const handleOpenGroup = async (groupId) => {
    setLoadingActiveGroup(true);
    try {
      const res = await groupApi.getById(groupId);
      setActiveGroup(res.data.data);
      setActiveGroupSheets(res.data.data.sheets || []);
      // Re-fetch groups to update the lastOpenedAt sorting in the sidebar
      const listRes = await groupApi.list();
      setGroups(listRes.data.data || []);
    } catch (err) {
      console.error("Failed to load group details:", err);
      alert("Failed to load group sheets");
    } finally {
      setLoadingActiveGroup(false);
    }
  };

  // Pin / Unpin group
  const handleTogglePin = async (e, group) => {
    e.stopPropagation();
    try {
      await groupApi.update(group.id, { isPinned: !group.isPinned });
      fetchGroups();
      if (activeGroup && activeGroup.id === group.id) {
        setActiveGroup(prev => ({ ...prev, isPinned: !group.isPinned }));
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  // Delete group
  const handleDeleteGroup = async (e, groupId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this group? The sheets inside will NOT be deleted.")) return;
    try {
      await groupApi.delete(groupId);
      fetchGroups();
      if (activeGroup && activeGroup.id === groupId) {
        setActiveGroup(null);
        setActiveGroupSheets([]);
      }
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  // Trigger create modal
  const triggerCreateGroup = () => {
    setGroupName("");
    setGroupDesc("");
    setSelectedSheetIds([]);
    setSheetSearch("");
    fetchAllSheetsForSelection();
    setShowCreateModal(true);
  };

  // Trigger edit modal
  const triggerEditGroup = () => {
    if (!activeGroup) return;
    setGroupName(activeGroup.name);
    setGroupDesc(activeGroup.description || "");
    setSelectedSheetIds(activeGroup.sheets?.map(s => s.id) || []);
    setSheetSearch("");
    fetchAllSheetsForSelection();
    setShowEditModal(true);
  };

  // Submit Create Group
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const res = await groupApi.create({
        name: groupName,
        description: groupDesc,
        sheetIds: selectedSheetIds,
      });
      setShowCreateModal(false);
      fetchGroups();
      // Auto open newly created group
      if (res.data.data) {
        handleOpenGroup(res.data.data.id);
      }
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group");
    }
  };

  // Submit Edit Group
  const handleEditGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      await groupApi.update(activeGroup.id, {
        name: groupName,
        description: groupDesc,
        sheetIds: selectedSheetIds,
      });
      setShowEditModal(false);
      fetchGroups();
      handleOpenGroup(activeGroup.id);
    } catch (err) {
      console.error("Failed to update group:", err);
      alert("Failed to update group");
    }
  };

  const handleToggleSheetSelection = (sheetId) => {
    setSelectedSheetIds(prev => 
      prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
    );
  };

  // Filter sheets inside select list
  const filteredSheets = allSheets.filter(sheet => 
    sheet.sheetNumber.toLowerCase().includes(sheetSearch.toLowerCase()) ||
    sheet.grade.toLowerCase().includes(sheetSearch.toLowerCase()) ||
    sheet.supplier.toLowerCase().includes(sheetSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Sheet Groups
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">
            Organize and group active master or son sheets for easy batch tracking
          </p>
        </div>
        {isManager && (
          <button
            onClick={triggerCreateGroup}
            className="flex items-center gap-2 px-4 py-2 h-9 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer text-sm focus:outline-none"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Create Group
          </button>
        )}
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
        {/* Left Sidebar: Groups List (40% width) */}
        <div className="w-full md:w-80 shrink-0 flex flex-col bg-bg-surface border border-border rounded-xl theme-transition overflow-hidden">
          <div className="p-3 border-b border-border bg-bg-elevated/20 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
              Your Groups ({groups.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-muted text-center p-4">
                <Folder className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-xs font-semibold text-text-secondary">No groups yet</p>
                <p className="text-[10px] mt-0.5">Create a group to categorize your sheets</p>
              </div>
            ) : (
              groups.map((group) => {
                const isActive = activeGroup && activeGroup.id === group.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => handleOpenGroup(group.id)}
                    className={`group flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-all duration-150 border ${
                      isActive
                        ? "bg-primary/5 border-primary text-primary"
                        : "border-border hover:bg-bg-elevated hover:border-text-muted text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      isActive ? "bg-primary/20 text-primary" : "bg-bg-elevated text-text-muted"
                    }`}>
                      <FolderOpen className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`font-semibold truncate text-sm leading-snug ${
                          isActive ? "text-primary" : "text-text-primary"
                        }`}>
                          {group.name}
                        </h3>
                        {group.isPinned && (
                          <Pin className="w-3 h-3 text-warning shrink-0 fill-warning rotate-45" />
                        )}
                      </div>
                      {group.description && (
                        <p className="text-[10px] text-text-muted truncate mt-0.5">
                          {group.description}
                        </p>
                      )}
                      <span className="inline-block text-[9px] font-semibold text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wide">
                        {group.itemCount || 0} Sheets
                      </span>
                    </div>

                    {/* Quick controls */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      {isManager && (
                        <>
                          <button
                            onClick={(e) => handleTogglePin(e, group)}
                            className={`p-1 rounded hover:bg-bg-hover transition-colors ${
                              group.isPinned ? "text-warning" : "text-text-muted hover:text-warning"
                            }`}
                            title={group.isPinned ? "Unpin Group" : "Pin Group"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${group.isPinned ? "fill-warning rotate-45" : ""}`} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteGroup(e, group.id)}
                            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-danger transition-colors"
                            title="Delete Group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Content Area: Detailed view of sheets in selected group (60% width) */}
        <div className="flex-1 flex flex-col bg-bg-surface border border-border rounded-xl theme-transition overflow-hidden">
          {loadingActiveGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading group sheets...</p>
            </div>
          ) : !activeGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-center p-8">
              <FolderOpen className="w-16 h-16 opacity-15 mb-3" />
              <h2 className="text-base font-semibold text-text-secondary">No Group Selected</h2>
              <p className="text-xs max-w-sm mt-1 mx-auto leading-relaxed">
                Select a sheet group from the sidebar to view, manage, and batch-track its active materials.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Group Detail Header */}
              <div className="shrink-0 p-4 border-b border-border bg-bg-elevated/10 flex items-start justify-between">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-primary leading-tight truncate">
                      {activeGroup.name}
                    </h2>
                    {isManager && (
                      <button
                        onClick={(e) => handleTogglePin(e, activeGroup)}
                        className={`p-1 rounded hover:bg-bg-hover transition-colors shrink-0 ${
                          activeGroup.isPinned ? "text-warning" : "text-text-muted hover:text-warning"
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${activeGroup.isPinned ? "fill-warning rotate-45" : ""}`} />
                      </button>
                    )}
                  </div>
                  {activeGroup.description && (
                    <p className="text-xs text-text-secondary mt-0.5 leading-tight">
                      {activeGroup.description}
                    </p>
                  )}
                  <span className="inline-block text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded mt-2 uppercase tracking-wide">
                    {activeGroupSheets.length} Associated Sheets
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isManager && (
                    <button
                      onClick={triggerEditGroup}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-text-primary bg-bg-elevated hover:bg-bg-hover border border-border rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      Manage Items
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/groups/${activeGroup.id}/canvas`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                  >
                    <GitBranch className="w-3 h-3" />
                    Canvas View
                  </button>
                  {isManager && (
                    <button
                      onClick={(e) => handleDeleteGroup(e, activeGroup.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Group
                    </button>
                  )}
                </div>
              </div>

              {/* Group Sheets Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {activeGroupSheets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <Layers className="w-12 h-12 opacity-20 mb-2" />
                    <p className="text-sm font-semibold text-text-secondary">This group is empty</p>
                    <p className="text-xs mt-0.5 max-w-xs mx-auto">
                      Click the **Manage Items** button above to select sheets and add them to this group.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                    {activeGroupSheets.map((sheet) => (
                      <SheetCard key={sheet.id} sheet={sheet} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CREATE GROUP MODAL ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-bg-surface w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up theme-transition">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-bg-elevated/20 shrink-0">
              <h2 className="text-sm font-bold text-text-primary">Create New Sheet Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4 space-y-4 flex-1">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Project Alpha Materials"
                    className="w-full h-9 px-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                    Description (Optional)
                  </label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Describe what these sheets are grouped for..."
                    rows={2}
                    className="w-full p-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm resize-none"
                  />
                </div>

                {/* Sheet selection */}
                <div className="flex-1 flex flex-col min-h-[250px]">
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                    Select Sheets to Include ({selectedSheetIds.length} Selected)
                  </label>

                  {/* Selection search bar */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      placeholder="Search sheets by number..."
                      className="w-full h-8 pl-8 pr-3 bg-bg-elevated border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </div>

                  {/* List Container */}
                  <div className="flex-1 border border-border rounded-lg bg-bg-elevated/10 overflow-y-auto max-h-56 p-1 space-y-1">
                    {loadingSheets ? (
                      <div className="py-8 flex items-center justify-center gap-1.5 text-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs">Loading active sheets...</span>
                      </div>
                    ) : filteredSheets.length === 0 ? (
                      <p className="text-center text-xs text-text-muted py-8">No sheets match search</p>
                    ) : (
                      filteredSheets.map((sheet) => {
                        const isChecked = selectedSheetIds.includes(sheet.id);
                        return (
                          <div
                            key={sheet.id}
                            onClick={() => handleToggleSheetSelection(sheet.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                              isChecked
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-bg-elevated text-text-secondary"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-text-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 flex justify-between items-center pr-2">
                              <div className="flex flex-col flex-1 min-w-0 pr-2">
                                <span className="font-semibold text-text-primary truncate">
                                  {sheet.sheetNumber}
                                </span>
                                <span className="text-[9px] text-text-muted font-mono">
                                  ID: {sheet.id.split('-')[0]}
                                </span>
                              </div>
                              <span className="text-[10px] text-text-muted">
                                {sheet.length}x{sheet.width}x{sheet.thickness} mm
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 p-4 border-t border-border bg-bg-elevated/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-bg-hover rounded-lg transition-colors border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT GROUP ITEMS MODAL ═══ */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-bg-surface w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up theme-transition">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-bg-elevated/20 shrink-0">
              <h2 className="text-sm font-bold text-text-primary">Manage Sheet Group Items</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditGroupSubmit} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4 space-y-4 flex-1">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm resize-none"
                  />
                </div>

                {/* Sheet selection */}
                <div className="flex-1 flex flex-col min-h-[250px]">
                  <label className="block text-[10px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                    Select Sheets in Group ({selectedSheetIds.length} Selected)
                  </label>

                  {/* Selection search bar */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      placeholder="Search sheets by number..."
                      className="w-full h-8 pl-8 pr-3 bg-bg-elevated border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </div>

                  {/* List Container */}
                  <div className="flex-1 border border-border rounded-lg bg-bg-elevated/10 overflow-y-auto max-h-56 p-1 space-y-1">
                    {loadingSheets ? (
                      <div className="py-8 flex items-center justify-center gap-1.5 text-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs">Loading active sheets...</span>
                      </div>
                    ) : filteredSheets.length === 0 ? (
                      <p className="text-center text-xs text-text-muted py-8">No sheets match search</p>
                    ) : (
                      filteredSheets.map((sheet) => {
                        const isChecked = selectedSheetIds.includes(sheet.id);
                        return (
                          <div
                            key={sheet.id}
                            onClick={() => handleToggleSheetSelection(sheet.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                              isChecked
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-bg-elevated text-text-secondary"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-text-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 flex justify-between items-center pr-2">
                              <div className="flex flex-col flex-1 min-w-0 pr-2">
                                <span className="font-semibold text-text-primary truncate">
                                  {sheet.sheetNumber}
                                </span>
                                <span className="text-[9px] text-text-muted font-mono">
                                  ID: {sheet.id.split('-')[0]}
                                </span>
                              </div>
                              <span className="text-[10px] text-text-muted">
                                {sheet.length}x{sheet.width}x{sheet.thickness} mm
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 p-4 border-t border-border bg-bg-elevated/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-bg-hover rounded-lg transition-colors border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
