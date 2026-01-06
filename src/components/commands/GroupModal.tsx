import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandGroup } from '@/stores/commandGroupsStore';

interface GroupModalProps {
  isOpen: boolean;
  group: Partial<CommandGroup> | null;
  parentId?: string;
  allGroups: CommandGroup[];
  onSave: (data: { name: string; description?: string; parentId?: string }) => void;
  onClose: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  group,
  parentId,
  allGroups,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [selectedParentId, setSelectedParentId] = useState<string>(parentId || group?.parentId || '');

  useEffect(() => {
    if (isOpen) {
      setName(group?.name || '');
      setDescription(group?.description || '');
      setSelectedParentId(parentId || group?.parentId || '');
    }
  }, [isOpen, group, parentId]);

  const getDescendantIds = (groupId: string): Set<string> => {
    const descendants = new Set<string>();
    const findDescendants = (id: string) => {
      allGroups.filter(g => g.parentId === id).forEach(child => {
        descendants.add(child.id);
        findDescendants(child.id);
      });
    };
    findDescendants(groupId);
    return descendants;
  };

  const availableParentGroups = useMemo(() => {
    if (!group?.id) {
      return allGroups;
    }
    const descendantIds = getDescendantIds(group.id);
    return allGroups.filter(g => g.id !== group.id && !descendantIds.has(g.id));
  }, [allGroups, group?.id]);

  const getGroupPath = (groupId: string): string => {
    const path: string[] = [];
    let current = allGroups.find(g => g.id === groupId);
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? allGroups.find(g => g.id === current!.parentId) : undefined;
    }
    return path.join(' / ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      parentId: selectedParentId || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {group?.id ? t('commandGroups.editGroup') : t('commandGroups.createGroup')}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">{t('commandGroups.name')}</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('commandGroups.namePlaceholder')}
              autoFocus
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">{t('commandGroups.parentGroup')}</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedParentId}
              onChange={e => setSelectedParentId(e.target.value)}
            >
              <option value="">{t('commandGroups.noParent')}</option>
              {availableParentGroups.map(g => (
                <option key={g.id} value={g.id}>
                  {getGroupPath(g.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">{t('commandGroups.description')}</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('commandGroups.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('commandGroups.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {t('commandGroups.save')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
};

