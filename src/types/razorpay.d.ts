export type RazorpayPaymentSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  handler: (response: RazorpayPaymentSuccess) => void;
  modal: {
    backdropclose: boolean;
    escape: boolean;
    handleback: boolean;
    confirm_close: boolean;
    ondismiss: () => void;
  };
};

export type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

export {};
