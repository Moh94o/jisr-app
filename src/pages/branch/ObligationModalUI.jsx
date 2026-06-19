import React from 'react'
import { Modal as FkModal, ModalSection } from '../../components/ui/FormKit.jsx'

// Shared modal chrome for the branch obligation forms (rent / utilities / phones).
// Thin wrapper over FormKit's Modal + ModalSection so the obligation popups inherit
// the unified chrome. Per the FormKit contract the window itself never scrolls —
// callers with tall content must split it into pages on the FormKit Modal directly.
// All fields inside these popups must be FormKit fields (TextField, DateField,
// CurrencyField, Select, FileField...) — the old custom pickers (DatePick / NiceSel)
// and raw input styles were removed in favour of the canonical components.

export function ObModal({ title, Icon, sectionLabel, SectionIcon, width = 600, onClose, footer, children }) {
  return (
    <FkModal open onClose={onClose} title={title} Icon={Icon} footer={footer} width={width}>
      {sectionLabel
        ? <ModalSection Icon={SectionIcon} label={sectionLabel}>{children}</ModalSection>
        : children}
    </FkModal>
  )
}
