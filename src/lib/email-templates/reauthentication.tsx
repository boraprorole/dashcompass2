import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import * as s from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação DashCompass</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>DashCompass</Text>
        <Heading style={s.h1}>Código de verificação</Heading>
        <Text style={s.text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Text style={s.code}>{token}</Text>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          O código expira em poucos minutos. Se você não solicitou, ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
