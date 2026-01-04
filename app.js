const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));  // Frontend HTML এর জন্য

// আপনার Razorpay Test Key এখানে রাখুন (Dashboard থেকে নিন)
const KEY_ID = 'rzp_test_RyaMPzw7w8of7y';  // rzp_test_ দিয়ে শুরু
const KEY_SECRET = 'NPxVEHfDXye3BMDcoNhUisQO';

const rzp = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET
});

// অর্ডার তৈরি (₹6 এর জন্য 600 paise)
app.post('/create-order', async (req, res) => {
  try {
    const order = await rzp.orders.create({
      amount: 600,  // VisaLive $6 = ₹6 approx
      currency: 'INR',
      receipt: 'visa_live_receipt_' + Date.now()
    });
    res.json({ id: order.id, key: KEY_ID, amount: order.amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/verify-payment', (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id } = req.body;
    
    // ✅ HEADER থেকে signature নিন
    const razorpay_signature = req.headers['x-razorpay-signature'];
    
    // ✅ Environment variable ব্যবহার করুন
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    
    const shasum = crypto.createHmac('sha256', KEY_SECRET);
    shasum.update(razorpay_order_id + '|' + razorpay_payment_id);
    const signature = shasum.digest('hex');

    console.log('Expected:', signature);
    console.log('Received:', razorpay_signature);

    if (signature === razorpay_signature) {
      res.json({ 
        success: true, 
        payment_id: razorpay_payment_id,
        message: 'Payment verified ✅'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid signature ❌' 
      });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
  }
});
// টেস্ট পেজ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>VisaLive Razorpay Test</title></head>
    <body>
      <h1>🛂 VisaLive SECURE - Pay $6</h1>
      <button id="pay-btn">💰 Pay ₹6 Now</button>
      <p id="result"></p>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        document.getElementById('pay-btn').onclick = function() {
          fetch('/create-order', {method: 'POST'})
            .then(r => r.json())
            .then(data => {
              var options = {
                key: data.key,
                amount: data.amount,
                currency: 'INR',
                name: 'VisaLive SECURE',
                description: '1 Month Slot Access',
                order_id: data.id,
                handler: function(response) {
                  fetch('/verify-payment', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(response)
                  })
                  .then(r => r.json())
                  .then(result => {
                    document.getElementById('result').innerHTML = 
                      result.success ? '✅ Payment Success: ' + result.payment_id : '❌ Payment Failed';
                  });
                },
                prefill: { name: 'User', contact: '9999999999' },
                theme: { color: '#3399cc' }
              };
              var rzp1 = new Razorpay(options);
              rzp1.open();
            });
        };
      </script>
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Server চলছে: http://localhost:3000');
  console.log('Key ID লোড হয়েছে:', KEY_ID ? 'হ্যাঁ' : 'না');
});
