import { lazy, Suspense } from 'react';
import { useModal } from '../context/ModalContext';

// Lazy-load all modals to prevent heavy libraries (SheetJS, PDF, SignalR) from bloating initial bundle
const TopupModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.TopupModal })));
const WithdrawModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.WithdrawModal })));
const SubscribeModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.SubscribeModal })));
const UpgradeVipModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.UpgradeVipModal })));
const PlanPurchaseModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.PlanPurchaseModal })));
const HireModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.HireModal })));
const ClaimModal = lazy(() => import('./modals/PayModals').then(m => ({ default: m.ClaimModal })));

const DeliverableModal = lazy(() => import('./modals/DeliverableModals').then(m => ({ default: m.DeliverableModal })));
const RevisionModal = lazy(() => import('./modals/DeliverableModals').then(m => ({ default: m.RevisionModal })));
const DeliverableReviewModal = lazy(() => import('./modals/DeliverableModals').then(m => ({ default: m.DeliverableReviewModal })));

const ReceiptModal = lazy(() => import('./modals/MiscModals').then(m => ({ default: m.ReceiptModal })));
const ViewJobModal = lazy(() => import('./modals/MiscModals').then(m => ({ default: m.ViewJobModal })));
const SuccessModal = lazy(() => import('./modals/MiscModals').then(m => ({ default: m.SuccessModal })));

const ReportModal = lazy(() => import('./modals/ReportModal'));
const ChatModal = lazy(() => import('./modals/ChatModal'));
const ReviewModal = lazy(() => import('./modals/ReviewModal'));
const KycModal = lazy(() => import('./modals/KycModal'));
const DisputeModal = lazy(() => import('./modals/DisputeModal'));
const DisputeDetailModal = lazy(() => import('./modals/DisputeDetailModal'));
const DeadlineExtensionModal = lazy(() => import('./modals/DeadlineExtensionModal'));

export default function ModalRoot() {
  const { modal, closeModal } = useModal();
  if (!modal) return null;
  const props = { onClose: closeModal, ...modal.props };

  const renderModal = () => {
    switch (modal.type) {
      case 'topup': return <TopupModal {...props} />;
      case 'withdraw': return <WithdrawModal {...props} />;
      case 'subscribe': return <SubscribeModal {...props} />;
      case 'upgradeVip': return <UpgradeVipModal {...props} />;
      case 'planPurchase': return <PlanPurchaseModal {...props} />;
      case 'hire': return <HireModal {...props} />;
      case 'claim': return <ClaimModal {...props} />;
      case 'deliverable': return <DeliverableModal {...props} />;
      case 'revision': return <RevisionModal {...props} />;
      case 'deliverableReview': return <DeliverableReviewModal {...props} />;
      case 'receipt': return <ReceiptModal {...props} />;
      case 'viewJob': return <ViewJobModal {...props} />;
      case 'report': return <ReportModal {...props} />;
      case 'success': return <SuccessModal {...props} />;
      case 'chat': return <ChatModal {...props} />;
      case 'review': return <ReviewModal {...props} />;
      case 'kyc': return <KycModal {...props} />;
      case 'dispute': return <DisputeModal {...props} />;
      case 'disputeDetail': return <DisputeDetailModal {...props} />;
      case 'deadlineExtension': return <DeadlineExtensionModal {...props} />;
      default: return null;
    }
  };

  return (
    <Suspense fallback={null}>
      {renderModal()}
    </Suspense>
  );
}
