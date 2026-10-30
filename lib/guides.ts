import referenceGuides from "@/data/reference-guides.json";
import { Guide, validateGuide } from "./schema";
/** Source-reviewed reference content. Generated additions come from the persistent store. */
export const guides: Guide[] = referenceGuides.map(validateGuide);
