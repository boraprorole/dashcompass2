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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso ao {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>{siteName}</Text>
        <Heading style={s.h1}>Seu link de acesso</Heading>
        <Text style={s.text}>
          Clique no botão abaixo para entrar na sua conta. O link é de uso único e expira em pouco
          tempo.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Entrar no {siteName}
        </Button>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          Se você não solicitou este acesso, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
