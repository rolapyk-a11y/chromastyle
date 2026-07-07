# Basic Virtual Try-On Plan

## Objective

Build a free, browser-side virtual try-on flow for Outfitter that lets a user take or upload a photo of themselves, then preview real clothing items from the wardrobe on their body without spending FASHN credits.

FASHN stays locked behind owner-only paid access. The free preview becomes the default experience.

## Product Goal

The user should be able to answer:

- Does this colour work on me?
- Does this clothing shape suit my body?
- Does this fit look too baggy, too slim, or balanced?
- Is this item worth opening/buying?

This does not need to be photorealistic at first. It needs to be useful for shopping decisions.

## Phase 1 - Manual Free Preview

Status: done

Build a free preview inside the existing try-on modal.

Features:

- Take photo or upload a full-body photo.
- Place the real product image over the user's photo.
- Move garment horizontally.
- Move garment vertically.
- Scale garment.
- Rotate garment.
- Adjust opacity.
- Choose blend mode.
- Reset placement to category preset.
- Download/save the preview image.

Category presets:

- Tops/shirts/knitwear: chest and torso.
- Outerwear: slightly wider and lower torso overlay.
- Pants/trousers: waist and legs.

Verification:

- No FASHN API call happens when using Free Preview.
- Paid AI Try-On still requires explicit confirmation.
- Server rejects FASHN calls from non-owner accounts.

## Phase 2 - Auto Body Placement

Status: done

Add browser-side pose detection.

Preferred model:

- MediaPipe Pose Landmarker, because it gives richer body landmarks.

Alternative:

- TensorFlow.js MoveNet, because it is fast and simple.

Use landmarks:

- Shoulders: top garment width and angle.
- Hips: trouser waist placement.
- Torso center: vertical garment placement.
- Shoulder-to-hip length: top scale.
- Hip-to-ankle length: trouser scale.

Output:

- The app auto-places the product image before the user adjusts sliders.

Implementation notes:

- Added MediaPipe Tasks Vision as the browser pose detection layer.
- Added `lib/tryon/posePlacement.ts`.
- The free preview now detects shoulders and hips when possible.
- Tops/outerwear are aligned to the shoulder/torso area.
- Trousers are aligned to hips and legs.
- If pose detection fails, the app falls back to manual category presets.

## Phase 3 - Product Image Cleanup

Status: in progress

Retailer product images are messy. Clean them in the browser.

Features:

- Remove near-white backgrounds.
- Trim transparent margins.
- Center garment.
- Preserve original image if cleanup fails.
- Cache cleaned image in memory/localStorage for the session.

Implementation notes:

- Added `/api/image-proxy` so retailer images can be loaded by canvas through the app origin.
- Free Preview now attempts to remove plain white/light-gray product backgrounds automatically.
- The user can manually run `Clean Image` or switch back with `Use Original`.
- Cleaned images are kept in component memory for the current item preview.

Verification:

- White-background product images look less like rectangular stickers.
- Product images with real models still show acceptably.

## Phase 4 - Basic Garment Warping

Status: in progress

Add lightweight canvas warping.

Tops:

- Rotate to shoulder angle.
- Stretch width to shoulder width.
- Scale height to torso length.
- Optional waist taper.

Pants:

- Align waistband to hips.
- Scale to leg length.
- Slight rotation based on hip/leg angle.

Implementation notes:

- Pose detection now returns separate width and length fit values.
- Free Preview has `Width fit` and `Length fit` sliders.
- Tops use shoulder/hip ratio to suggest width.
- Outerwear starts wider and slightly longer.
- Trousers start narrower and longer based on hip-to-ankle distance.
- Saved previews use the same width/length shaping as the on-screen preview.

This is still not photorealistic fabric simulation. It is a practical preview.

## Phase 5 - Outfit Preview

Status: in progress

Allow multiple wardrobe items in one preview.

Features:

- Top + trousers.
- Outerwear over top.
- Save outfit preview.
- Score outfit with `lib/outfitEngine.ts`.

Implementation notes:

- Generated outfit cards now expose `Preview Outfit`.
- Added an outfit try-on modal for the user's ranked outfit combinations.
- The modal captures/uploads a body photo and overlays top, bottom, jacket, and shoes together.
- Real wardrobe item images are used when available.
- If a wardrobe item has no image, the preview falls back to that item's saved colour swatch.
- Pose detection auto-fits each clothing layer where possible.
- Outfit preview can be saved as a composed image.

Output:

- A user can build and preview complete outfits, not just single items.

## Phase 6 - Paid AI Escalation

Keep FASHN as a deliberate owner-only action.

Rules:

- Free Preview is always first.
- FASHN button says it uses paid credits.
- Client asks for confirmation.
- Server requires `paidConfirmed: true`.
- Server requires owner allowlist via `FASHN_ALLOWED_EMAILS` or `FASHN_ALLOWED_USER_IDS`.

## Success Criteria

- User can take/upload a photo and preview any wardrobe product for free.
- Product image is the real scraped/retailer image, not a colour fill.
- Preview controls are good enough to judge colour, silhouette, and proportion.
- FASHN cannot be triggered accidentally or by other users.
- The feature remains useful even with no paid API keys configured.
