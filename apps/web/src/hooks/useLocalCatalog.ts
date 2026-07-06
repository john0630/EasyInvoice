import { useCallback, useEffect, useState } from "react";
import type { DocumentFormData } from "@easy-invoice/shared";
import {
  addBusiness,
  businessToSeller,
  deleteBusiness,
  deleteBuyer,
  deleteLineItemPreset,
  deleteNotePreset,
  getActiveBusiness,
  getActiveBusinessId,
  listBusinesses,
  listBuyers,
  listLineItemPresets,
  listNotePresets,
  recordDocumentCatalog,
  setActiveBusinessId,
  upsertBusiness,
  upsertLineItemPreset,
  upsertNotePreset,
  type SavedBusiness,
  type SavedBuyer,
  type SavedLineItemPreset,
  type SavedNotePreset,
  type SellerInfo,
} from "@/lib/localCatalog";

export function useLocalCatalog() {
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([]);
  const [activeBusinessId, setActiveId] = useState("");
  const [buyers, setBuyers] = useState<SavedBuyer[]>([]);
  const [lineItemPresets, setLineItemPresets] = useState<SavedLineItemPreset[]>([]);
  const [notePresets, setNotePresets] = useState<SavedNotePreset[]>([]);

  const refresh = useCallback(() => {
    setBusinesses(listBusinesses());
    setActiveId(getActiveBusinessId());
    setBuyers(listBuyers());
    setLineItemPresets(listLineItemPresets());
    setNotePresets(listNotePresets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) ?? getActiveBusiness();
  const seller = businessToSeller(activeBusiness);

  const selectBusiness = useCallback(
    (id: string) => {
      setActiveBusinessId(id);
      setActiveId(id);
      refresh();
    },
    [refresh],
  );

  const createBusiness = useCallback(
    (name?: string) => {
      const b = addBusiness(name);
      refresh();
      return b;
    },
    [refresh],
  );

  const saveBusiness = useCallback(
    (business: SavedBusiness) => {
      upsertBusiness(business);
      refresh();
    },
    [refresh],
  );

  const removeBusiness = useCallback(
    (id: string) => {
      deleteBusiness(id);
      refresh();
    },
    [refresh],
  );

  const removeBuyer = useCallback(
    (id: string) => {
      deleteBuyer(id);
      refresh();
    },
    [refresh],
  );

  const removeLineItemPreset = useCallback(
    (id: string) => {
      deleteLineItemPreset(id);
      refresh();
    },
    [refresh],
  );

  const saveLineItemPreset = useCallback(
    (preset: SavedLineItemPreset) => {
      upsertLineItemPreset(preset);
      refresh();
    },
    [refresh],
  );

  const saveNote = useCallback(
    (text: string) => {
      const saved = upsertNotePreset(text);
      refresh();
      return saved;
    },
    [refresh],
  );

  const removeNotePreset = useCallback(
    (id: string) => {
      deleteNotePreset(id);
      refresh();
    },
    [refresh],
  );

  const updateNotePreset = useCallback(
    (id: string, text: string) => {
      upsertNotePreset(text, id);
      refresh();
    },
    [refresh],
  );

  const recordFromDocument = useCallback(
    (form: DocumentFormData, sellerInfo: SellerInfo) => {
      if (!activeBusinessId) return;
      recordDocumentCatalog(form, sellerInfo, activeBusinessId);
      refresh();
    },
    [activeBusinessId, refresh],
  );

  return {
    businesses,
    activeBusinessId,
    activeBusiness,
    seller,
    buyers,
    lineItemPresets,
    notePresets,
    selectBusiness,
    createBusiness,
    saveBusiness,
    removeBusiness,
    removeBuyer,
    removeLineItemPreset,
    saveLineItemPreset,
    saveNote,
    removeNotePreset,
    updateNotePreset,
    recordFromDocument,
    refresh,
  };
}
