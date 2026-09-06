import React, { useState } from 'react';
import { ProductProvider, useProducts } from './context/ProductContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { ProductList } from './components/ProductList';
import { ProductDetail } from './components/ProductDetail';
import { PositionsInventoryView } from './components/PositionsInventoryView';
import { InspectionsView } from './components/InspectionsView';
import { KonSarView } from './components/KonSarView';
import { TermMerodView } from './components/TermMerodView';
import { BeepuloView } from './components/BeepuloView';
import { FejSaruView } from './components/FejSaruView';
import { SaruSpecsView } from './components/SaruSpecsView';
import { KanbanView } from './components/KanbanView';
import { RendelesView } from './components/RendelesView';
import { DashboardView } from './components/DashboardView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ProductEditModal } from './components/ProductEditModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { PrintLabelModal } from './components/PrintLabelModal';
import { Product } from './types';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useProducts();

  // Modals state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setEditModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };

  const handleOpenPrintLabel = (product: Product) => {
    setProductToPrint(product);
    setPrintModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-[#181C1C] flex flex-col font-['Hanken_Grotesk',sans-serif]">
      {/* Top Application Header */}
      <Header
        onOpenScanner={() => setScannerOpen(true)}
        onOpenNewProduct={handleOpenNewProduct}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-24 md:pb-8">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          onOpenSyncModal={() => setSyncModalOpen(true)}
          onOpenScanner={() => setScannerOpen(true)}
        />

        {/* Content Container */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0 overflow-x-hidden">
          {activeTab === 'inventory' && (
            <ProductList
              onOpenNewProduct={handleOpenNewProduct}
              onOpenSyncModal={() => setSyncModalOpen(true)}
            />
          )}

          {activeTab === 'positions' && <PositionsInventoryView />}

          {activeTab === 'inspections' && <InspectionsView />}

          {activeTab === 'konsar' && <KonSarView />}

          {activeTab === 'termmerod' && <TermMerodView />}

          {activeTab === 'beepulo' && <BeepuloView />}

          {activeTab === 'fejsaru' && <FejSaruView />}
          {activeTab === 'saruspecs' && <SaruSpecsView />}
          {activeTab === 'kanban' && <KanbanView />}
          {activeTab === 'rendeles' && <RendelesView onOpenSyncModal={() => setSyncModalOpen(true)} />}

          {activeTab === 'detail' && (
            <ProductDetail
              onEdit={handleOpenEditProduct}
              onPrintLabel={handleOpenPrintLabel}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenSyncModal={() => setSyncModalOpen(true)}
              onOpenScanner={() => setScannerOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Bar Navigation */}
      <MobileNav
        onOpenScanner={() => setScannerOpen(true)}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />

      {/* Modals & Dialogs */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />

      <GoogleSheetsSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
      />

      <ProductEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <PrintLabelModal
        isOpen={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setProductToPrint(null);
        }}
        product={productToPrint}
      />
    </div>
  );
};

export default function App() {
  return (
    <ProductProvider>
      <MainAppContent />
    </ProductProvider>
  );
}
