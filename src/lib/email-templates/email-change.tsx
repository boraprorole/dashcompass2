import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import * as s from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração de e-mail no {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>{siteName}</Text>
        <Heading style={s.h1}>Confirme seu novo e-mail</Heading>
        <Text style={s.text}>
          Recebemos um pedido para alterar o e-mail da sua conta de{' '}
          <strong style={{ color: '#ffffff' }}>{oldEmail || email}</strong> para{' '}
          <strong style={{ color: '#ffffff' }}>{newEmail || email}</strong>.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Confirmar alteração
        </Button>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          Se você não solicitou esta alteração, ignore este e-mail e sua conta permanece inalterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
