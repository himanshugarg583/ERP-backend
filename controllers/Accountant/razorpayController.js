const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 * @route POST /api/accountant/payment/create-order
 */
const createOrder = async (req, res) => {
  try {
    const { amount, student_id, academic_year, payment_for } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid amount is required"
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // amount in paise (multiply by 100)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        student_id: student_id || '',
        academic_year: academic_year || '',
        payment_for: payment_for || 'Fee Payment'
      }
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Order created successfully",
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error creating payment order",
      error: error.message
    });
  }
};

/**
 * Verify Razorpay payment signature
 * @route POST /api/accountant/payment/verify-payment
 */
const verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      student_id,
      academic_year,
      payment_for
    } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Payment details are incomplete"
      });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Signature is valid - payment is successful
      
      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Payment verified successfully",
        data: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: payment.amount / 100, // Convert back to rupees
          status: payment.status,
          method: payment.method,
          email: payment.email,
          contact: payment.contact,
          verified: true
        }
      });
    } else {
      // Signature verification failed
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Payment verification failed - Invalid signature",
        verified: false
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error verifying payment",
      error: error.message
    });
  }
};

/**
 * Get payment details by payment ID
 * @route GET /api/accountant/payment/details/:payment_id
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const payment = await razorpay.payments.fetch(payment_id);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment details fetched successfully",
      data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching payment details",
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails
};
