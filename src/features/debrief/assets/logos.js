const districtLogoUrl = '/debrief/logos/district75-logo.png';
const fffLogoUrl = '/debrief/logos/fff-logo.png';

/** Logos officiels (PNG transparents), servis comme fichiers statiques par Vite. */
export const FFF_LOGO = fffLogoUrl;
export const DISTRICT75_LOGO = districtLogoUrl;

/** Charge une image et la convertit en data URL (jsPDF travaille de façon synchrone). */
export function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Logo introuvable : ${url}`));
    image.src = url;
  });
}

/** Charge les deux logos du débrief, avec repli sur leurs URL si la conversion échoue. */
export async function loadLogoDataUrls({
  fff = FFF_LOGO,
  district = DISTRICT75_LOGO,
  load = loadImageAsDataUrl,
} = {}) {
  const [fffLogo, districtLogo] = await Promise.all([
    load(fff).catch(() => fff),
    load(district).catch(() => district),
  ]);
  return { fffLogo, districtLogo };
}
