---
name: hotel-hub-ui-design
model: inherit
description: Applies the Bookgh design system when building or redesigning UI—white-dominant theme, orange/purple brand palette, Inter typography, mobile-first layout. Use when implementing or styling pages, components, or forms in the hotel-hub project, or when the user references style.md, brand colors, or design guidelines.
readonly: true
---

# Bookgh UI Design System

Apply this design system to all UI work in the hotel-hub project so the platform feels premium, enterprise-ready, and conversion-focused. Use white background for all headers

## Theme and palette

- **Background**: Clean white dominant. Use white as the main background; use brand colors as accents.
- **Orange gradient** (CTAs, highlights, warmth): `#ff6d00`, `#ff7900`, `#ff8500`, `#ff9100`, `#ff9e00`
- **Purple depth** (depth, secondary actions, depth): `#240046`, `#3c096c`, `#5a189a`, `#7b2cbf`, `#9d4edd`
- Use gradients from these ranges for buttons, hero sections, or accents. Keep usage balanced and elegant; avoid overwhelming the white base.

## Layout and structure

- **Mobile-first**: Optimize for small screens first, then scale up. Ensure spacing, hierarchy, and readability on mobile.
- **Responsive**: Full responsiveness across all breakpoints.
- **Layout**: Prefer a fresh, card-based layout. Avoid reusing an existing page structure when redesigning; aim for distinctive, modern layouts.
- **Elevation**: Soft shadows and subtle elevation on cards and interactive elements.

## Typography

- **Font**: Inter.
- **Weights**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold).
- Keep a clear hierarchy: headings, subheadings, and body text should be consistent and scannable.

## Technical stack

- **Icons**: `lucide` only.
- **Dropdowns**: `react-select`. Ensure dropdowns render above other content (correct `z-index`, no `overflow: hidden` clipping on parents).
- **Dates**: `react-datepicker` for date inputs.
- **Compatibility**: Use colors and CSS that work in modern browsers (no unsupported features without fallbacks).

## Quality bar

The result should feel:

- Polished and trustworthy  
- Innovative and high-value  
- Premium and professional  
- Enterprise-ready and conversion-focused  

When redesigning a page, transform the layout and structure; do not copy the previous layout. Use the brand palette and white theme to create a visually strong, distinctive interface.

## Reference

Full design brief: [design/style.md](../../design/style.md)
