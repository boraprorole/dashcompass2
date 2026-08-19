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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para o {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>{siteName}</Text>
        <Heading style={s.h1}>Você recebeu um convite</Heading>
        <Text style={s.text}>
          Você foi convidado para acessar o{' '}
          <Link href={siteUrl} style={s.link}>
            <strong>{siteName}</strong>
          </Link>
          , a plataforma de relatórios e inteligência de marketing.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Aceitar convite
        </Button>
        <Hr style={s.hr} />
        <Text style={s.footer}>
          Se você não esperava este convite, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
