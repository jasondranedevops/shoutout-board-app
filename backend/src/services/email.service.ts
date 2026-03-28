import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@shoutboard.io'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function sendBoardDeliveryEmail(
  recipientEmail: string,
  recipientName: string,
  boardSlug: string,
  boardTitle: string
): Promise<void> {
  try {
    const boardUrl = `${APP_URL}/boards/${boardSlug}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You've Received a Shoutboard!</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Your team has created a special recognition card for you: <strong>${boardTitle}</strong></p>
              <p>Check out the heartfelt messages and well-wishes from your colleagues:</p>
              <a href="${boardUrl}" class="button">View Your Shoutboard</a>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This link will remain active for your personal use.
              </p>
            </div>
            <div class="footer">
              <p>Shoutboard - Employee Recognition Platform</p>
              <p><a href="https://shoutboard.io" style="color: #667eea; text-decoration: none;">Visit Shoutboard</a></p>
            </div>
          </div>
        </body>
      </html>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `${boardTitle} - A Special Message from Your Team`,
      html,
    })
  } catch (error) {
    console.error('Failed to send board delivery email:', error)
    throw error
  }
}

export async function sendContributorInvite(
  email: string,
  boardTitle: string,
  shareLink: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited to Contribute!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>You've been invited to add a message to a Shoutboard: <strong>${boardTitle}</strong></p>
              <p>Share your thoughts, appreciation, or well-wishes with your colleague:</p>
              <a href="${shareLink}" class="button">Contribute to Shoutboard</a>
            </div>
            <div class="footer">
              <p>Shoutboard - Employee Recognition Platform</p>
            </div>
          </div>
        </body>
      </html>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Contribute to "${boardTitle}"`,
      html,
    })
  } catch (error) {
    console.error('Failed to send contributor invite:', error)
    throw error
  }
}
