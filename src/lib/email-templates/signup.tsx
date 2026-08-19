import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

import * as s from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para acessar o {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>{siteName}</Text>
        <Heading style={s.h1}>Confirme seu e-mail</Heading>
        <Text style={s.text}>
          Obrigado por criar sua conta no{' '}
          <Link href={siteUrl} style={s.link}>
            <strong>{siteName}</strong>
          </Link>
          . Falta só um passo para começar a acompanhar seus relatórios.
        </Text>
        <Text style={s.text}>
          Confirme o endereço <strong style={{ color: '#ffffff' }}>{recipient}</strong> clicando no
          botão abaixo:
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Confirmar e-mail
        </Button>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          Se você não criou esta conta, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
