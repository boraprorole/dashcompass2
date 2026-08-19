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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha do {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>{siteName}</Text>
        <Heading style={s.h1}>Redefinir sua senha</Heading>
        <Text style={s.text}>
          Recebemos um pedido para redefinir a senha da sua conta no {siteName}. Clique no botão
          abaixo para criar uma nova senha.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Criar nova senha
        </Button>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          Se você não fez esta solicitação, ignore este e-mail — sua senha atual continua válida.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
