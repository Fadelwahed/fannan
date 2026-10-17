---
version: alpha
name: DigitalCloud Sandbox
description: Test design system for Fannan skill compatibility.
colors:
  primary: "#0B3D91"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#1A1A1A"
  muted: "#5A5F66"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
breakpoints:
  desktop: 1440px
---

## Overview
Calm, trustworthy, editorial. Desktop first at 1440px.

## Colors
Deep blue primary on white surfaces; muted grey for secondary text.

## Typography
One family, two roles: large bold headlines, comfortable body.

## Layout
12-column grid, 1200px max content width, 32px section gutters.

## Components
Primary button uses the primary color with white text.

## Do's and Don'ts
- Do keep contrast at WCAG AA or better.
- Don't use more than one accent color.
